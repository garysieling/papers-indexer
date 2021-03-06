const fs = require('fs');
const { exec } = require('child_process');
const cheerio = require('cheerio');
const md5 = require('md5');
const url = require('url');

async function GetTextFromPDF(path) {
    let doc = await pdfjsLib.getDocument(path).promise;
    let page1 = await doc.getPage(1);
    let content = await page1.getTextContent();
    let strings = content.items.map(function(item) {
        return item.str;
    });
    return strings;
}

const roots = [
    'https://www.lexjansen.com/phuse-us/',
    'https://www.lexjansen.com/pharmasug-cn/',
    'https://www.lexjansen.com/css-us/',
    'https://www.lexjansen.com/phuse/',
    'https://www.lexjansen.com/cdisc/',
    'https://www.lexjansen.com/sugi/',
    'https://www.lexjansen.com/wuss/',
    'https://www.lexjansen.com/sesug/',
    'https://www.lexjansen.com/nesug/',
    'https://www.lexjansen.com/views/',
    'https://www.lexjansen.com/pharmasug/',
    'https://www.lexjansen.com/mwsug/',
    'https://www.lexjansen.com/scsug/',
    'https://www.lexjansen.com/pnwsug/',
    'https://www.lexjansen.com/seugi/'
];

let requestLimit = 50;

const memoizeHttp = (url) => {
    if (requestLimit <= 0) {
        //console.log('No more requests');
        return null;
    }

    const code = md5(url);
    const folder = code.substr(0, 4);

    const extension = 
        url.match(/[.][a-z]+$/) ?
            url.substring(url.lastIndexOf('.')) :
            '.html';
   

    const file = code.substr(4) + extension;

    if (!fs.existsSync('files/' + folder)) {
        fs.mkdirSync('files/' + folder);
    }

    const destination = 'files/' + folder + '/' + file;

    if (!fs.existsSync(destination)) {
        console.log('Getting ' + destination);

        const command = `curl -o "${destination}" "${url}"`; 

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }

            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }

            console.log(`stdout: ${stdout}`);
        });
        
        requestLimit--;
    } else {
        //console.log('Already exists: ' + destination);
    }

    return [url, destination];
}

const rootFiles = roots.map(
    memoizeHttp
).filter(
    (f) => !!f
);

function resolve(from, to) {
    const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
    if (resolvedUrl.protocol === 'resolve:') {
      // `from` is a relative URL.
      const { pathname, search, hash } = resolvedUrl;
      return pathname + search + hash;
    }
    return resolvedUrl.toString();
  }
  
requestLimit = 50;

const conferences = [];
rootFiles.map(
    ([url, file]) => {
        console.log('Looking at ' + file + ', for ' + url);
        const $ = cheerio.load(fs.readFileSync(file));
        
        $('.conference a').each(
            (i, elt) => {
                const ref = $(elt).attr('href');

                if (ref) {
                    const newUrl = resolve(url, ref);
                    const newFile = memoizeHttp(newUrl);

                    if (newFile) {
                        conferences.push(newFile);
                    }
                }
            }
        )
    }
);


  
requestLimit = 50;

const papers = [];

console.log("Conferences: " + conferences.length);
const htmlparser2 = require('htmlparser2');

conferences.map(
    ([url, file]) => {
        //console.log('Conference, looking at ' + file + ', for ' + url);
        //const options = {};
        const document = fs.readFileSync(file);
        //const dom = htmlparser2.parseDocument(document, options);
        const $ = cheerio.load(document);
        
        $('#rightpanel .paper a').each(
            (i, elt) => {
                const ref = $(elt);                
                
                const href = ref.attr('href');
                if (href) {
                    //const newUrl = resolve(url, ref);
                    const newFile = memoizeHttp(href);

                    if (newFile) {
                        papers.push(newFile);
                        console.log(href);
                    }
                }
            }
        )
    }
);

const pdf = require('pdf-parse');

console.log('Found papers: ' + papers);

papers.map(
  ([url, pdffile]) => {
    let dataBuffer = fs.readFileSync(pdffile);

    pdf(dataBuffer).then(function(data) { 
      // number of pages
      //console.log(data.numpages);
      // number of rendered pages
      //console.log(data.numrender);
      // PDF info
      console.log(data.info);
      // PDF metadata
      console.log(data.metadata); 
      // PDF.js version
      // check https://mozilla.github.io/pdf.js/getting_started/
      //console.log(data.version);
      // PDF text
      //console.log(data.text); 

      const textFile = pdffile.replace(/.pdf$/i, '.txt');
      const jsonFile = pdffile.replace(/.pdf$/i, '.json');

      fs.writeFileSync(textFile, data.text);
      
      data.source = url;
      data.textFile = textFile;
      data.jsonFile = jsonFile;
      data.pdfFile = pdffile;

      fs.writeFileSync(jsonFile, data.text);
   });  
});

