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

## I.E.

> my-service.js
```ruby
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
```ruby
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
