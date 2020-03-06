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
    provide: ['$timeout']
    mock: {
      myOtherService: null
    }
  }
});

myService = testBed.service;
```

The provide object will assume that the dependency already exists in the enviorment and fetch it using angular's $inject service, the mock object will be used to create jasmine spy objects for us to mock away all behavior that needs to be mocked from our dependencies,
both provided and mocked dependencies are accesible trough the ```javascript testBed.get('<dependencyName>') ``` method
