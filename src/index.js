/* eslint-disable strict */
var path = require('path');
//Hello World
var createPattern = function (pattern) {
    return {
        pattern: pattern,
        included: true,
        served: true,
        watched: false
    };
};

var init = function (files) {
    files.unshift(createPattern(path.join(__dirname, 'init.js')));
};

init.$inject = ['config.files'];

module.exports = {
    'framework:jasmine-angularjs': ['factory', init]
};
