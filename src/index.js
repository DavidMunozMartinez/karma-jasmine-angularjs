'use strict';
/**Unit tests utilities library for creating and providing all necessary data for angularjs unit test setup */

/**
 * Creates a new controller instance of a given controller name
 * @param {injector} injector AngularJS injector service used to get the necessary services to instantiate a new controller
 * @param {String} ctrlName The name of the controller we want to instantiate
 */
function createController(injector, ctrlName) {
    var $rootScope = injector.get('$rootScope');
    var $controller = injector.get('$controller');
    var $scope = $rootScope.$new();
    var controller = $controller(ctrlName, {
        $scope: $scope
    });

    return {
        controller: controller,
        scope: $scope
    };
}


/**
 * Creates jasmine spies and provides them over a modifier function to
 * @param {Object} data object with keys that represent the spy name and the values represent the spy methods or values
 * @param {(name: String, value: any)=> {}} modifier Optional modifier function that will be excuted over every new jasmine spy, returns
 * the spy name and value assigned to it
 */
function buildJasmineSpies(data, modifier) {
    var keys = Object.keys(data);
    keys.forEach(function (key) {
        var value = data[key];
        var spy = buildJasmineSpy(key, value);
        if (modifier) {
            modifier(key, spy);
        }
    });
}

/**
 * Creates a jasmine spy that will be used as a fake dependency for the service we are trying to instantiate
 * @param {String} name jasmine spy name
 * @param {any} values Value that will be assigned to the created jasmine spy
 */
function buildJasmineSpy(name, values) {
    // For more on jasmine spies see: https://jasmine.github.io/api/edge/Spy
    var jasmineSpyObj = null;
    // If its an empty object it means that we are not using any method of this dependency
    if (jQuery.isEmptyObject(values)) {
        jasmineSpyObj = jasmine.createSpy(name);
    }

    // If its not empty then we have methods to mock for this dependency
    else {
        jasmineSpyObj = jasmine.createSpyObj(name, values);
        var valuesKey = Object.keys(values);

        /**For each method that we are trying to mock we use the "callFake" method from jasmine spy objects
         * so that we can control the behavior if there is any defined */
        valuesKey.forEach(function (valueKey) {
            var value = values[valueKey];
            if (value) {
                if (typeof value === 'function') {
                    jasmineSpyObj[valueKey].and.callFake(value);
                } else {
                    jasmineSpyObj[valueKey] = value;
                }
            }
        });
    }
    return jasmineSpyObj;
}

/**
 *
 * @param {Object} options options object that will contain all the configuration configuration for the TestBed
 * @param {String} options.module name of the module that will be mocked for the testbed
 * @param {String} options.service name of the service that will be injected for the testBed
 * @param {String} options.controller name of the controller that will be injected for the testBed
 * @param {Object} options.dependencies object that will contain all data that will be used to create fake dependencies
 * or provide angular services to our testbed
 * @param {Array<String>} options.dependencies.provide Angular services to inject in our testbed
 * @param {Object} options.dependencies.mock Fake dependencies and methods to mock that will be provided in our testbed
 */
function configure(options) {
    var injector = null;
    var provider = null;
    var dependencies = {
        mocked: {},
        provided: {}
    };

    // Defining our module
    module(options.module, function (_$provide_) {
        provider = _$provide_;
    });

    // Handle dependencies
    if (options.dependencies) {
        var mock = options.dependencies.mock;
        var provide = options.dependencies.provide || [];
        inject(function ($injector) {
            injector = $injector;
            // Provide actual angular services to our environment here
            provide.forEach(function (dependency) {
                dependencies.provided[dependency] = injector.get(dependency);
            });
        });
        if (mock) {
            buildJasmineSpies(options.dependencies.mock, function (name, spy) {
                dependencies.mocked[name] = spy;
                provider.factory(name, function () {
                    return spy;
                });
            });
        }
    }

    // Define the test utils object
    var testUtils = {
        $provider: provider,
        $injector: injector,
        provided: dependencies.provided,
        mocked: dependencies.mocked,
        get: injector.get
    };

    if (options.service) {
        try {
            testUtils.service = injector.get(options.service);
        } catch (e) {
            throw 'Failed to inject service: ' + options.service + '\n' + e;
        }
    }

    if (options.controller) {
        try {
            var ctrl = createController(injector, options.controller);
            testUtils.controller = ctrl.controller;
            testUtils.provided.$scope = ctrl.scope;
        } catch (e) {
            throw 'Failed to inject controller: ' + options.controller + '\n' + e;
        }
    }

    return testUtils;
}

function init() {
    window.TestBed = {
        configure: configure
    };
}


module.exports = {
    'framework:jasmine-angularjs': ['factory', init]
}