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
There is a few thing that we need to take into account to setup a proper environment for unit testing angularjs components

The module our component belongs to, our component name, and its dependencies.

### I.E.

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
     * instance of the given component (controller/service).
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
### Handle dependencies

Dependency handling is also very easy, for an angular component to be properly instantiated, all of its dependencies need to be previously injected, imagine our service looks like this:

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

The provide object will assume that the dependency already exists in the environment and try to fetch it using angular's $inject service, the mock object will be used to create jasmine spy objects for us to mock away all behavior that needs to be mocked from our dependencies,
both provided and mocked dependencies are accessible trough the ```testBed.get('<dependencyName>') ``` method.

### Mocking dependencies behavior

Notice how in the mock property we created an object with a null value, the value is reserved for specific methods that we might need to mock inside a specific test for that dependency, for example:

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

Imagine we want to test "myService.sum" method, but notice that our "myService.sum" method uses another function from one of its dependencies, in reality we only care to know if "myService.sum" executes its logic correctly, not only that but, trying to inject "myOtherService" would require that we also make sure that all of its dependencies are injected in the environment, so make this simpler we can define specific behavior to our mocked dependencies to make sure we only test the code that we want.

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

With this we can always make sure that whenever "myService" needs to execute "myOtherService.veryComplexLogic" it will always return true and we can avoid all the hazard of injecting all the dependencies

### Mocking dependencies on the fly

What if we want to mock behavior for a specific test, we can also assign specific behavior for a single test on the fly by calling ```var myOtherService = testBed.get('myOtherService'); ``` where "myOtherService" will contain an instance of the jasmine spy object created internally for us to control and alter as we need.

