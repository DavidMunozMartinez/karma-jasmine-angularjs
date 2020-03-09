# karma-jasmine-angularjs
Simpler way to write unit tests for AngularJS with karma and jasmine

# Installation
```
npm install karma-jasmine-angularjs --save-dev
```

# Configuration
> karma.conf.js
```javascript
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine-angularjs'],
    // includes all specs and js files
    files: [
      '*.js'
    ]
  })
}
```

# Setup
Setting up an angularjs Unit Tests might seem complicated, but once you break it down into parts it becomes very understandable.
There is a few thing that we need to take into account to setup a proper environment for unit testing angularjs components which are:

The module our component belongs to, our component name, and its dependencies.

### Service.

> my-service.js
```javascript
angular
  .module('myModule', [])
  .service('myService', myService);
 
myService () {
  this.sum = function (a, b) {
    return a + b;
  };
}
```

> my-service.spec.js
```javascript
describe('My service tests', function () {
  var testBed;
  var myService;
  beforeEach(function () {
    testBed = TestBed.configure({
      module: 'myModule',
      service: 'myService'
    });
    
    /*
     * The test bed programagically handles mocking the module, injecting the service and returning an 
     * instance of the given component.
     */
    myService = testBed.service;
  });
  
  describe('initialize'. function () {
    it('Should be defined', function () {
      expect(myService).toBeDefined();
    });
  });
  
  describe('sum', function () {
    it('Should sum two values', function () {
      var valueOne = 2;
      var valueTwo = 2;
      var result = myService.sum(valueOne, valueTwo);
      
      expect(result).toBe(4);
      
    });
  });
});
```

### Factory

> my-factory.spec.js
```javascript
testBed = TestBed.configure({
  module: 'myModule',
  factory: 'myFactory'
});

/*
  * The test bed programagically handles mocking the module, injecting the factory and returning an 
  * instance of the given component.
  */
myFactory = testBed.factory;

```

### Controller

> my-controller.js
```javascript
angular
  .module('myModule', [])
  .controller('myController', myController);
 
myController ($scope) {
  $scope.initialValue = 0;
}
```

> my-controller.spec.js
```javascript
testBed = TestBed.configure({
  module: 'myModule',
  controller: 'myController'
});

/*
  * The test bed programagically handles mocking the module, injecting the controller and returning an 
  * instance of the given component.
  */
myController = testBed.controller;
$scope = testBed.$scope;
```
For controllers we make its scope accessible trough the testBed.$scope

### Directive

> my-directive.spec.js
```javascript
testBed = TestBed.configure({
  module: 'myModule',
  directive: 'myDirective'
});

myDirective = testBed.directive;
$scope = testBed.$scope;
```

## Directive extras

# scope
If our directive has scope properties, we can also mock them by passing data trough the 'scope' property in the configuration object.
# require
If our directive uses the require property we can mock a parent by passing its name throughout the 'parent' property 
# child directives
If our directive contains other custom directives on in its template, to avoid injecting them we also mock them by passing their names into the 'children' property

NOTE: the directive will be rendered as configured in its definition object, these are helper properties to mock all the necessary information that a directive might need to be able to instantiate itself


> my-directive.spec.js
```javascript
testBed = TestBed.configure({
  module: 'myModule',
  directive: 'myDirective',
  scope: { 
    customData: {}
   }
  parent: 'myParentName',
  children: ['myChildCustomDirective']
});

myDirective = testBed.directive;
$scope = testBed.$scope;
```


## Handle dependencies

Dependency handling is also very easy, for an AngularJS component to be properly instantiated, all of its dependencies need to be previously injected. Imagine our service looks like this:

> my-service.js
```javascript
angular
  .module('myModule', [])
  .service('myService', myService);
 
myService ($timeout, myOtherService) {
  this.sum = function (a, b) {
    return a + b;
  };
}
```

Here we have native angular service and our custom service as dependencies, for the test bed to handle this we need to add the following to our configuration object.

```javascript
testBed = TestBed.configure({
  module: 'myModule',
  service: 'myService',
  dependencies: {
    provide: ['$timeout'],
    mock: {
      myOtherService: null
    }
  }
});

myService = testBed.service;
```

The provide object will assume that the dependency already exists in the environment and try to fetch it using angular's $inject service; the mock object will be used to create jasmine spy objects for us to mock away all behavior that needs to be mocked from our dependencies.
Both provided and mocked dependencies are accessible through the ```testBed.get('<dependencyName>') ``` method.

### Mocking dependencies behavior

Notice how in the mock property we created an object with a null value. The value is reserved for specific methods that we might need to mock inside a specific test for that dependency, for example:

Lets say we have two services:
```javascript
angular
  .module('myModule', [])
  .service('myService', myService);
 
myService ($timeout, myOtherService) {
  this.sum = function (a, b) {
    var result a + b;
    var isValid = myOtherService.veryComplexLogic(result);
    return isValid ? result : null;
  };
}

myOtherService($timeout, crazyDepdendency, anotherDependency) {
  this.veryComplexLogic = function (value) {
    if (typeof value != 'number') {
      value = parseInt(value);
    }
    else {
      ... More crazy logic with other dependencies and stuff
    }
  };
}
```

Imagine we want to test "myService.sum" method, but notice that our "myService.sum" method uses another function from one of its dependencies. In reality, we only care to know if "myService.sum" executes its logic correctly so we shouldn't worry about what "myOtherService.veryComplexLogic" does. Not only that but, trying to inject "myOtherService" would require that we also make sure that all of its dependencies are injected in the environment. So, to make this simpler, we can define specific behavior to our mocked dependencies to make sure we only test the code that we want.

```javascript
testBed = TestBed.configure({
  module: 'myModule',
  service: 'myService',
  dependencies: {
    provide: ['$timeout'],
    mock: {
      myOtherService: {
        veryComplexLogic: function () { return true; }
      }
    }
  }
});

myService = testBed.service;
```

With this we can always make sure that whenever "myService" needs to execute "myOtherService.veryComplexLogic" it will always return true and we can avoid all the hazard of injecting all the dependencies.

### Mocking dependencies on the fly

But, what if we want to mock behavior for a specific test? We can also assign specific behavior for a single test on the fly by calling ```var myOtherService = testBed.get('myOtherService'); ``` where "myOtherService" will contain an instance of the jasmine spy object created internally for us to control and alter as we need.

> my-service.js
```javascript
angular
  .module('myModule', [])
  .service('myService', myService);
 
myService ($timeout, myOtherService) {
  this.sum = function (a, b) {
    var result a + b;
    var isValid = myOtherService.veryComplexLogic(result);
    return isValid ? result : null;
  };
}

myOtherService($timeout, crazyDepdendency, anotherDependency) {
  this.veryComplexLogic = function (value) {
    if (typeof value != 'number') {
      value = parseInt(value);
    }
    else {
      ... More crazy logic that uses other dependencies and stuff
    }
  };
}
```

> my-service.spec.js
```javascript
describe('My service tests', function () {
  var testBed;
  var myService;
  beforeEach(function () {
    testBed = TestBed.configure({
      module: 'myModule',
      service: 'myService',
      dependencies: {
        mock: {
          myOtherService: {
            veryComplexLogic: function () { return true; }
          }
        }
      }
    });
    
    /*
     * The test bed programagically handles mocking the module, injecting the service and returning an 
     * instance of the given component.
     */
    myService = testBed.service;
  });
  
  describe('initialize'. function () {
    it('Should be defined', function () {
      expect(myService).toBeDefined();
    });
  });
  
  describe('sum', function () {
    it('Override dependencies behavior', function () {
      var valueOne = 2;
      var valueTwo = 2;
      // Use the testBed get method to get the dependency
      var myOtherService = testBed.get('myOtherService');
      // Change myOtherService jasmine spy behavior
      myOtherService.veryComplexLogic.and.callFake(function () {
        return false;
      });

      var result = myService.sum(valueOne, valueTwo);
      expect(result).toBeNull();
      
    });
  });
});
```

When we define our dependency we can decide what type of behavior it should have, but we can override that behavior at any given time for any test by directly modifying the jasmine spy object created.
For more on jasmine spies see: https://jasmine.github.io/api/edge/Spy

This is not a framework or a strict guide on how to write your unit tests, this library is not invasive to the karma, jasmine or angularjs environment, this library is meant to be a plug-n-play helper for faster and more productive unit testing.

Thank you for reading this far! :)
