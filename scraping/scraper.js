var request = require('request'),
    cheerio = require('cheerio'),
    fs      = require('fs');

var debug = process.argv[2] == 'debug' || process.argv[2] == '-d' ? true : false;
var numSemesters;
if (debug) {
    numSemesters = process.argv[3] || 4;
}
else {
    numSemesters = Infinity;
}

// Order of events:
// 1. Parse 'search page' to get all the filters (departments, areas, etc.)
// 	  and most importantly, get possible semesters
// 2. Query using those semesters, to build a database. Set up translation
//    to turn cryptic stuff from existing schedule into most understandable
//    terms. For instance, instead of '201510' (a.k.a. Fall 2014) it would be
//    an object with { '2014': { 'fall': data } }, etc.
// 3. Make second pass over the data, to perform the conversion of ugly data
//    into nice, readable stuff, as a static pre-process step
// 4. Save the filters and the course data into html files to be included in
//    in the jade files.


// Things to keep in mind:
// - Async stuff should be preferably be promises, not callbacks
// - Not everything is or should be async
// - All network stuff (requests) should be async
// - This is fairly sequential, so overall structure can probably not be async

// =========================== General Stuff ==========================

// poolForRequests = {
//     maxSockets: Infinity
// }

function get(url) {
    // Return a new promise.
    return new Promise(function requestGet(resolve, reject) {
        request.get(url, /*{ pool: poolForRequests },*/ function handleGetResponse(err, resp, body) {
            if (err || resp.statusCode != 200) {
                reject(Error(err || ('Status Code was ' + resp.statusCode)));
            }
            else {
                resolve(body);
            }
        });
    });
}

// Slightly specialized for use in posting for semester data
function semesterPost(url, formData) {
    // Have to perform a deep copy for the variable to not be overwritten by the time the callback is used.
    // var copiedFormData = JSON.parse(JSON.stringify(formData));
    var semesterCode = formData.schedule_beginterm;

    return new Promise(function requestPost(resolve, reject) {
        console.log('Posting for ' + semesterCode);
        request.post(url, { form: formData/*, pool: poolForRequests*/ }, function handlePostResponse(err, resp, body) {
            if (err) {
                return reject(Error(err));
            }
            else {
                return resolve({ code: semesterCode, body: body });
            }
        });
    });
}

function formatConvertYear(intYear) {
    return (intYear - 1).toString() + '-' + intYear.toString();
}

function handlePromiseError(err) {
    console.error('Errored in a Promise');
    console.error(err.stack);
    throw err;
}


// =========================== Filter Stuff ===========================

// All the filters we care about.
var filters = [
    'subject_sch',
    'foundation_sch',
    'division_sch',
    'area_sch',
    'schedule_beginterm'
    // 'intmajor_sch' // Currently don't care about interdisciplinary majors
];

function prettifyFilterValue(filterValueText) {
    // Possibly inefficient due to unnecessary replaces
    return filterValueText.trim()
        .replace(/Found: /, '')
        .replace(/Area: /, '')
        .replace(/Division: /, '');
}

var filterTranslator;
function prettifyFilter(filterName) {
    filterTranslator = filterTranslator ||
    {
        'subject_sch': 'department',
        'foundation_sch': 'foundation',
        'division_sch': 'division',
        'area_sch': 'area',
        'schedule_beginterm': 'semester'
        // 'intmajor_sch': 'interdis_major' // Currently don't care about interdisciplinary majors
    };

    var translated = filterTranslator[filterName];
    if (translated === undefined) {
        translated = filterName;
    }

    return translated;
}

function fetchSearchPage() {
    return get('https://weblprod1.wheatonma.edu/PROD/bzcrschd.P_ListSection');
}

function parseOutFilters(searchPageBody) {
    var filterBlacklist = filterBlacklist || {
        '%': true,
        'CONX': true
    };

    var $ = cheerio.load(searchPageBody);

    var filterObj = {};

    filters.forEach(function handleEntry(filter) {
        var prettifiedFilter = prettifyFilter(filter);
        filterObj[prettifiedFilter] = [];

        $('select[name=' + filter + ']').find('option').each(function parseSelectOption() {
            var filterValue = $(this).val();
            if (!filterBlacklist[filterValue]) {
                filterObj[prettifiedFilter].push({ val: filterValue, display: prettifyFilterValue($(this).text()) });
            }
        });
    });

    return filterObj;
}

function getSearchFilters() {
    return fetchSearchPage()
        .then(parseOutFilters)
        .catch(handlePromiseError);
}

function preprocessFilters(filterObj) {
    // Preprocess to add the 'years' to the object, as they're something extra
    // not inherent in the old course schedule
    var integerSemesterCodes = filterObj.semester.map(function handleEntry(entry) {
        return parseInt(entry.val);
    });

    filterObj.year = [];

    // Floor the result of the integer code (in the format YYYYSS, for Year and Semester)
    // divided by 100, to isolate the year.
    var latestYear = Math.floor(Math.max.apply(null, integerSemesterCodes) / 100);
    var earliestYear = Math.floor(Math.min.apply(null, integerSemesterCodes) / 100);

    for (var currYear = latestYear; currYear >= earliestYear; --currYear) {
        var yearFilterValue = formatConvertYear(currYear);
        var yearFilterDisplay = 'Fall ' + (currYear - 1).toString() + ' - Spring ' + currYear.toString();
        filterObj.year.push({ val: yearFilterValue, display: yearFilterDisplay });
    }

    return filterObj;
}

// =========================== Course Stuff ===========================

courseAreaFinder = {
    'ARTS': 'ARCA',
    'CW': 'ARCA',
    'MUSC': 'ARCA',
    'THEA': 'ARCA',


    'HIST': 'ARHS',


    'ARTH': 'ARHM',
    'CLAS': 'ARHM',
    'ENG': 'ARHM',
    'FR': 'ARHM',
    'GER': 'ARHM',
    'HISP': 'ARHM',
    'ITAS': 'ARHM',
    'LAT': 'ARHM',
    'PHIL': 'ARHM',
    'REL': 'ARHM',
    'RUSS': 'ARHM',
    'WGS': 'ARHM', // (?)


    'COMP': 'ARMC',
    'MATH': 'ARMC',


    'AST': 'ARNS',
    'BIO': 'ARNS',
    'CHEM': 'ARNS',
    'PHYS': 'ARNS',


    'AFDS': 'ARSS',
    'ANTH': 'ARSS',
    'ECON': 'ARSS',
    'EDUC': 'ARSS',
    'POLS': 'ARSS',
    'PSY': 'ARSS',
    'SOC': 'ARSS'
};

function parseSemesterData(semester) {
    console.log('Queuing parsing for ' + semester.code);

    $ = cheerio.load(semester.body);

    var allRows = $('tr');

    var conxObj = {};

    allRows.each(function parseRow(index, element) {
        var $data = $(element).find('td');

        if ($data.length >= 10) {
            var connectionCodes = $($data[9]).text().trim().split(/\s/g);
            var courseCode = $($data[0]).text().trim();
            var courseArea = $($data[8]).text().trim();

            if (courseCode.toLowerCase() == 'course') {
                return;
            }

            if (courseArea === '') {
                courseArea = courseAreaFinder[courseCode.match(/([A-Z]{2,4})/)[1]];
            }

            courseCode = courseCode.match(/([A-Z]{2,4}-[0-9]{3})/)[1];

            connectionCodes.forEach(function handleCode(conxCode) {
                if (conxCode !== '') {
                    // console.log('Connection v1: ' + conxCode);
                    conxCode = parseInt(conxCode.slice(0, 2) + '0' + conxCode.slice(2, 4));
                    // console.log('Connection v2: ' + conxCode);

                    if (conxCode in conxObj) {
                        if (courseArea in conxObj[conxCode]) {
                            conxObj[conxCode][courseArea].push(courseCode);
                        }
                        else {
                            conxObj[conxCode][courseArea] = [courseCode];
                        }
                    }
                    else {
                        conxObj[conxCode] = {};
                        conxObj[conxCode][courseArea] = [courseCode];
                    }
                }
            });
        }
    });

    return conxObj;
}

function getAndParseSemesterHTML(semesterCodes) {
    return Promise.all(
        semesterCodes.map(function mapSemesterCodeToPromise(semesterCode) {
            var tempFormData = dataValues;
            tempFormData.schedule_beginterm = semesterCode.val;

            return semesterPost('https://weblprod1.wheatonma.edu/PROD/bzcrschd.P_OpenDoor', tempFormData)
                .then(parseSemesterData);
        })
    ).catch(handlePromiseError);
}

var dataValues = {
    'intmajor_sch' : '%',
    'area_sch' : '%',
    'submit_btn' : 'Search Schedule',
    'subject_sch' : '%',
    'foundation_sch' : '%',
    'schedule_beginterm' : '', // Nothing in this one yet
    'division_sch' : '%',
    'crse_numb' : '%',
};

function saveScheduleData(conxObjs) {
    var masterObj = {};

    conxObjs.forEach(function handleObj(conxObj) {
        for (var conxCode in conxObj) {
            if (!(conxCode in masterObj)) {
                masterObj[conxCode] = {};
            }

            for (var area in conxObj[conxCode]) {
                if (!(area in masterObj[conxCode])) {
                    masterObj[conxCode][area] = {};
                }

                for (var courseCode in conxObj[conxCode][area]) {
                    masterObj[conxCode][area][conxObj[conxCode][area][courseCode]] = true; // Use an object to avoid duplicates
                }
            }
        }
    });

    for (var conxCode in masterObj) {
        for (var area in masterObj[conxCode]) {
            masterObj[conxCode][area] = Object.keys(masterObj[conxCode][area]); // Convert object of booleans to array
        }
    }

    fs.writeFile('conx.json', JSON.stringify(masterObj, null, 2), function handleError(err) {
        console.log(err);
    });
}

// =========================== Driver Stuff ===========================

function fetchAndParseAll() {
    getSearchFilters()
        .then(preprocessFilters)
        .then(function selectInfo(filterObj) {
            return debug ? filterObj.semester.slice(0, numSemesters) : filterObj.semester;
        })
        .then(getAndParseSemesterHTML)
        .then(saveScheduleData)
        .catch(handlePromiseError);
}

fetchAndParseAll();