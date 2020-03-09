(function (window) {
	'use strict';
	/**Unit tests utilities library for creating and providing all necessary data for angularjs unit test setup */

	/**Setup global variable for the testbed */
	window.TestBed = {
		configure: configure
	};

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
		var type = null;
		var dependencies = {
			mocked: {},
			provided: {}
		};

		var validation = validateOptions(options);
		if (validation.errors.length > 0) {
			throw validation.errors;
		}
		else {
			type = validation.component;
		}

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
					// All mocked dependencies are injected as a factory for simplicity
					provider.factory(name, function () {
						return spy;
					});
				});
			}
		}
		else {
			inject(function ($injector) {
				injector = $injector;
			});
		}

		// Define the test utils object
		var testUtils = {
			$provider: provider,
			$injector: injector,
			// TODO remove provided and mocked objects from here, they are accsesible trough the get method
			provided: dependencies.provided,
			mocked: dependencies.mocked,
			get: injector.get
		};

		// At this point all of our component dependencies should be injected and we should be ready to create
		// an instance of it
		var instance = instantiateComponent(testUtils, options, type);
		testUtils[type] = instance.component;
		if (instance.scope) {
			testUtils.$scope = instance.scope;
		}
		return testUtils;
	}

	/**
	 * Validates that our options object contains all necessary and correct data for the library to properly initialize the required components
	 * @param {any} options Options object from the configure method
	 */
	function validateOptions(options) {
		var components = [];
		var missingProps = [];
		var errors = [];
		var mandatory = ['module'];

		mandatory.forEach(function (prop) {
			if (!options[prop]) {
				missingProps.push(prop);
			}
		});

		if (missingProps > 0) {
			var message = 'Missing';
			missingProps.forEach(function (prop) {
				message += ' ' + prop;
			});
			errors.push(message);
		}

		if (options.service) { components.push('service'); }
		if (options.factory) { components.push('factory'); }
		if (options.controller) { components.push('controller'); }
		if (options.directive) { components.push('directive'); }
		if (options.filter) { components.push('filter'); }

		if (components.length > 1) {
			errors.push('Cannot provide multiple component types in the config object, you can only provide either "service", "factory", "controller", "directive" or "filter"');
		}

		return {
			component: components[0],
			errors: errors
		};
	}

	/**
	 * Creates an instance of the component under testing, also returns a new scope for it of necessary.
	 * @param {any} options Options object from the configure method
	 * @param {String} type type of component that we are trying to instantiate (service/factory/controller/directive/filter)
	 */
	function instantiateComponent(utils, options, type) {
		var component = null;
		// Some components instantiate a new scope
		var scope = null;
        var name = options[type];
        var injector = utils.$injector;
        var provider = utils.$provider;
		switch (type) {
			case 'service':
			case 'factory':
				component = instantiateServiceOrFactory(injector, {
					name: name,
					type: type
				});
				break;
			case 'controller':
				var instance = instantiateController(injector, name);
				component = instance.controller;
				scope = instance.scope;
				break;
			case 'directive':
				var instance = instantiateDirective(injector, {
					testModule: options.testModule,
					name: name,
					parent: options.parent || null,
					children: options.children || [],
					scope: options.scope || null
				}, provider);
				component = instance.directive;
				scope = instance.scope;
				break;
			case 'filter':
				component = instantiateFilter(injector, name)
				break;
		}

		return {
			component: component,
			scope: scope
		};
	}

	/**
	 * Tries to instantiate and return the service or factory passed by it trough its config object
	 * @param {any} injector AngularJS injector
	 * @param {any} config Containes the type (service/factory) and name of the component trying to be injected.
	 */
	function instantiateServiceOrFactory(injector, config) {
		var instance = null;
		var name = config.name;
		var type = config.type;
		try {
			instance = injector.get(name);
		}
		catch (e) {
			throw 'Failed to instantiate ' + type + ': ' + name + '\n' + e;;
		}
		return instance;
	}

	/**
	 * Creates a new controller instance of a given controller name
	 * @param {injector} injector AngularJS injector service used to get the necessary services to instantiate a new controller
	 * @param {String} name The name of the controller we want to instantiate
	 */
	function instantiateController(injector, name) {
		try {
			var $rootScope = injector.get('$rootScope');
			var $controller = injector.get('$controller');
			var $scope = $rootScope.$new();
			var controller = $controller(name, {
				$scope: $scope
			});
	
			return {
				controller: controller,
				scope: $scope
			};
		}
		catch (e) {
			throw 'Failed to instantiate controller: ' + name + '\n' + e;
		}
	}

	/**
	 * Creates a new directive instance
	 * @param {any} injector AngularJS injector
	 * @param {any} definition Directive data needed to properly instantiate the directive under test
	 * @param {any} provider AngularJS provider to inject parent or child directives if required
	 */
	function instantiateDirective(injector, definition, provider) {
		try {
			var $rootScope = injector.get('$rootScope');
			var $compile = injector.get('$compile');
			var $scope = $rootScope.$new();
			// var $httpBackend = injector.get('$httpBackend');
			// $httpBackend.whenGET('*').passThrought();
			var parent = null;
			// We can define a parent for our directive, in case our directive to test requires it in its definition object
			if (definition.parent) {
				injectDummyDirective(provider, definition.parent);
				var parentName = definition.parent;
				var dashedParentName = camelCaseToDash(parentName);
				parent = document.createElement(dashedParentName);
			}

			// Our directive under test could hace child directives, we need to handle those as well
			if (definition.children.length > 0) {
				definition.children.forEach(function (name) {
					injectDummyDirective(provider, name);
				});
	
			}

			var dashedName = camelCaseToDash(definition.name);
			var element = document.createElement(dashedName);
			var $element = angular.element(element);
			if (definition.scope) {
				var keys = Object.keys(definition.scope);
				keys.forEach(function (key) {
					$scope[key] = definition.scope[key];
					$element.attr(key, key);
				});
			}
			var directive = $compile($element)($scope);
			if (parent) {
				var $parent = angular.element(parent);
				$compile($parent)({});
			}
			$scope.$digest();

			return {
				directive: directive,
				scope: $scope
			};
		}
		catch (e) {
			throw 'Failed to instantiate directive ' + definition.name + '\n' + e;
		}
	}

	/**
	 * Transforms camel case strings into dashed strings (with hyphen)
	 * @param {String} str String to transform
	 */
	function camelCaseToDash (str) {
		return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, '$1-').toLowerCase()
	}

	/**
	 * Injects a dummy directive with the given name, this helps initialize the main directive that probably has children on a required parent
	 * @param {any} provider AngularJS provider
	 * @param {string} name Directive name to inject
	 */
	function injectDummyDirective(provider, name) {
		provider.factory(name + 'Directive', function () {
			return {
				template: '<div></div>'
			};
		});
	}

	/**
	 * Creates an instance of a filter
	 * @param {any} injector AngularJS injector
	 * @param {String} name Filter name to inject
	 */
	function instantiateFilter(injector, name) {
		var $filter = injector.get('$filter');
		var component = $filter(name);

		return component;
	}

	/**
	 * Creates jasmine spies and provides them over a modifier function to
	 * @param {Object} data object with keys that represent the spy name and the values represent the spy methods or values
	 * @param {(name: String, value: any)=> {}} modifier Optional modifier function that will be executed over every new jasmine spy, returns
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
					}
					else {
						jasmineSpyObj[valueKey] = value;
					}
				}
			});
		}
		return jasmineSpyObj;
	}

    // pollify for startsWith in IE
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }
})(window);