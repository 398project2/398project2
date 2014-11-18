var request = require('request'),
    cheerio = require('cheerio');

function promiseGet(url) {
    return new Promise(function get(resolve, reject) {
        request.get(url, function handleResponse(err, resp, body) {
            if (err) { reject(Error(err)) }
            else resolve(body);
        });
    });
}

function fetchPage() {
    promiseGet('http://wheatoncollege.edu/academics/the-wheaton-curriculum/connections/connections-list/')
    .then(function handlePage(pageHTML) {
        var $ = cheerio.load(pageHTML);

        var links = [];

        $('a').each(function handleATag(index, element) {
            var link = $(element).attr('href');

            if (link && link.match(/\/catalog\/conx/)) {
                links.push(link);
            }
        });

        Promise.all(links.map(function mapLinkToPromise(entry) {
            return promiseGet('http://wheatoncollege.edu' + entry);
        })).then(function handleData(dataArray) {
            dataArray.forEach(function handlePage(page) {
                var $ = cheerio.load(page);

                console.log($('#body p:last-child').text());
            });
        });
    }).catch(function handleError(err) {
        console.log(err.stack);
        throw err;
    });
}

fetchPage();