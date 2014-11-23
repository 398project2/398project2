var request = require('request'),
    cheerio = require('cheerio'),
    fs      = require('fs'),
    jade    = require('jade');

var debug = process.argv[2] == 'debug' || process.argv[2] == '-d' ? true : false;
var numSemesters;
if (debug) {
    numSemesters = process.argv[3] || 4;
}
else {
    numSemesters = Infinity;
}

// Adding a method to arrays to 'clean' out unwanted values
Array.prototype.clean = function clean(deleteValue) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == deleteValue) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

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

// Slightly specialized for use in getting for TinyURL API
function tinyGet(url, key) {
    // Return a new promise.
    return new Promise(function requestGet(resolve, reject) {
        request.get(url, /*{ pool: poolForRequests }, */function handleGetResponse(err, resp, newURL) {
            if (err || resp.statusCode != 200) {
                reject(Error(err || ('TinyURL unhappy: ' + resp.statusCode)));
            }
            else {
                resolve({ key: key, newURL: newURL });
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

var filterBlacklist;
function parseOutFilters(searchPageBody) {
    var filterBlacklist = filterBlacklist || {
        '%': true,
        'CONX': true
    };

    var $ = cheerio.load(searchPageBody);

    var filterObj = {};

    filters.forEach(function handleEntry(filter, i, array) {
        var prettifiedFilter = prettifyFilter(filter);
        filterObj[prettifiedFilter] = [];

        $('select[name=' + filter + ']').find('option').each(function parseSelectOption(entry) {
            var filterValue = $(this).val();
            if (!filterBlacklist[filterValue]) {
                filterObj[prettifiedFilter].push({ val: filterValue, display: prettifyFilterValue($(this).text()) });
            }
        });
    });

    return filterObj;
}

function saveFilters(filterObj) {
    var promise = new Promise(function getFiltersTemplate(resolve, reject) {
        fs.readFile('static/course-data/filters.jade', function renderUsingTemplateFile(err, data) {
            if (err) {
                reject(Error(err));
            }
            else {
                var func = jade.compile(data, { pretty: /*debug*/false, doctype: 'html' });
                var html = func({ filterData: filterObj });
                resolve(html);
            }
        });
    }).then(function saveRenderedTemplate(html) {
        fs.writeFile('static/course-data/compiled/filters.html', html, function handleFileWriteResponse(err) {
            if (err) {
                console.error(err);
            }
            else {
                console.log('The filters html file was saved!');
            }
        });

        if (debug) {
            fs.writeFile('static/course-data/filters.json', JSON.stringify(filterObj, null, 2), function handleFileWriteResponse(err) {
                if (err) {
                    console.error(err);
                }
                else {
                    console.log('The filters json file was saved!');
                }
            });
        }
    }).catch(handlePromiseError);
}

function getSearchFilters() {
    return fetchSearchPage()
        .then(parseOutFilters)
        .catch(handlePromiseError);
}

function preprocessFilters(filterObj) {
    // Preprocess to add the 'years' to the object, as they're something extra
    // not inherent in the old course schedule
    var integerSemesterCodes = filterObj.semester.map(function handleEntry(entry, i, array) {
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

var scheduleData = {};

// Translates the number system that Wheaton uses into the word system that WAVE uses
var semesterTranslator = {
    10: 'fall',
    15: 'winter',
    20: 'spring',
    35: 'summer'
};
function extractInfoFromCode(semesterCode) {
    var integerCode = parseInt(semesterCode);
    var returnObj = { year: formatConvertYear(Math.floor(integerCode / 100)), semester: semesterTranslator[integerCode % 100] };

    return returnObj;
}

var divAreaFoundTranslator;
function prettifyDivAreaFound(raw) {
    divAreaFoundTranslator = divAreaFoundTranslator || {
        'ARCA': 'Creative Arts',
        'ARHS': 'History',
        'ARHM': 'Humanities',
        'ARMC': 'Math and Computer Science',
        'ARNS': 'Natural Science',
        'ARSS': 'Social Sciences',

        'DVAH': 'Arts and Humanities',
        'DVNS': 'Natural Sciences',
        'DVSS': 'Social Sciences',

        'BW':   'Beyond the West',
        'FS':   'First Year Seminar',
        'WR':   'First Year Writing',
        'FL':   'Foreign Language',
        'QA':   'Quantitative Analysis'
    };

    var translated = divAreaFoundTranslator[raw];
    if (translated === undefined) {
        translated = raw;
    }

    return translated;
}

function parseSemesterData(semester) {
    console.log('Queuing parsing for ' + semester.code);

    $ = cheerio.load(semester.body);

    var semesterCourses = {};
    var courseLabelPattern = /^\s*([A-Z][A-Z][A-Z]?[A-Z]?\-[0-9][0-9][0-9])/;

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

            courseCode = courseCode.match(/([A-Z]{2,4}-[0-9]{3})/)[1];

            connectionCodes.forEach(function handleCode(conxCode, index) {
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

    // console.log(conxObj);

    return conxObj;
}

// function postProcessSemesterData(semester) {
//     return semester;
// }

function getAndParseSemesterHTML(semesterCodes) {
    return Promise.all(
        semesterCodes.map(function mapSemesterCodeToPromise(semesterCode, i, array) {
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

function saveYearOfData(year) {
    return new Promise(function readTemplateFile(resolve, reject) {
        fs.readFile('static/course-data/courses.jade', function handleTemplateFileResponse(err, data) {
            var trash = err ? reject(Error(err)) : resolve(data);
        });
    }).then(function renderUsingTemplateFile(template) {
        var func = jade.compile(template, { pretty: /*debug*/false, doctype: 'html' });
        var html = func({ courseData: scheduleData[year], prettifyDivAreaFound: prettifyDivAreaFound });

        fs.writeFile('static/course-data/compiled/' + year + '.html', html, function handleFileWriteResponse(err) {
            if (err) {
                console.error(err);
            }
            else {
                console.log('The courses ' + year + ' html file was saved!');
            }
        });

        if (debug) {
            fs.writeFile('static/course-data/' + year + '.json', JSON.stringify(scheduleData[year], null, 2), function handleFileWriteResponse(err) {
                if (err) {
                    console.error(err);
                }
                else {
                    console.log('The courses ' + year + ' json file was saved!');
                }
            });
        }
    }).catch(handlePromiseError);
}

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

                conxObj[conxCode][area].forEach(function handleCourse(courseCode) {
                    // console.log('Adding ' + courseCode + ' to conxObj[' + conxCode + '][' + area + ']');
                    masterObj[conxCode][area][courseCode] = true;
                });
            }
        }
    });

    for (var conxCode in masterObj) {
        for (var area in masterObj[conxCode]) {
            masterObj[conxCode][area] = Object.keys(masterObj[conxCode][area]);
        }
    }

    console.log(JSON.stringify(masterObj, null, 2));
    // console.log(masterObj['20001']['ARCA']);
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