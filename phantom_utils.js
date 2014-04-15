var $_ = require('./asdf.server-min.js');
var MAX_TIMEOUT = 3000;
var RETRY_TIMEOUT = 20;
var PAGE_OPEN_TIMEOUT_SEC =0.5;
function step(){
	function create(onSuccess, onFailure){
		var steps = [];
		var running = false;
		function addLastStep(fn){
			if($_.O.isNotFunction(fn)) throw new Error('addLastStep need a Function');
			steps.push(fn);
		}
		function addFirstStep(fn){
			if($_.O.isNotFunction(fn)) throw new Error('addLastStep need a Function');
			steps.unshift(fn);
		}
		function nextRun(){
			var running = true;
			var arg = [].slice.call(arguments)
			try{
				if(steps.length){
					var f = steps.shift();
					return f.apply(this, arg);
				}else {
					return onSuccess();
				}
			}catch(e){
				onFailure(e);
			}
		}
		function add(fn){
			if(running)
				addFirstStep(fn);
			else
				addLastStep(fn);
		}
		return {
			nextRun: nextRun,
			add: add
		}
	}
	return {
		create: create
	}	
}

function dump(obj){
	var res = '';
	var TABSIZE = 4;
	function rec(o, inner){
		var s = '';
		$_.O.each(o, function (v, k){
			var vs;
			if($_.O.isFunction(v))
				vs = '[FUNCTION]';
			else if($_.O.isArray(v))
				vs = '[\n' + rec(v,inner+1) +'\n'+$_.S.times(' ', inner*TABSIZE)+']';
			else if($_.O.isObject(v))
				vs = '{\n' + rec(v,inner+1) +'\n'+$_.S.times(' ', inner*TABSIZE)+'}';
			else
				vs = '"' + v + '"';
			return s += $_.S.times(' ', inner*TABSIZE) + '"' + k + '" : ' + vs + '\n';
		});
		return s;
	}
	if($_.O.isObject(obj))
		res = '{\n'+ rec(obj, 1) +'\n}';
	res = res || obj
	console.log(res);
	return obj;
}

function pageOpen(page, url, nextFn){
	page.openUrl(encodeURI(url), {
		operation: 'get',
		data: undefined
	},
	page.settings);
   	$_.F.delay(nextFn, PAGE_OPEN_TIMEOUT_SEC);
}


function waitFor(page, testFn, onSuccess, onFailure, timeout, details){
	timeout = timeout || MAX_TIMEOUT;
	details = details || {testFn: testFn};
	if($_.O.isNotFunction(testFn)) throw new Error('waitFor() needs a test Function');
	var start = new Date().getTime();
	var condition = false;
	var interval = setTimeout(function fff() {
		if ( (new Date().getTime() - start < timeout) && !condition) {
			condition = testFn.call(page, page);
			setTimeout(fff, RETRY_TIMEOUT);
			return;
		}else {
			if(!condition) {
				console.log('time out');
				onFailure(page, timeout, details);
			}else {
				onSuccess(page)
			}
		}
	}, RETRY_TIMEOUT);
}
var waitForUrl = function(page, url, onSuccess, onFailure, timeout){
	"use strict";
	waitFor(page, function(){
		if($_.O.isString(url))
			return page.url.indexOf(url) !== -1;
		if($_.O.isRegexp(url))
			return url.test(page.url);
		throw new Error('waitForUrl need string or regexp');
	}, onSuccess, onFailure, timeout, {url: url});
}

var fillForm = function(page, obj, onSuccess, onFailure, details) {
	"use stric";
	var completed = false;
	if($_.O.isNotPlainObject(obj)) throw new Error('fillForm() needs a obj');
	
	page.includeJs("http://www.asdfjs.com/javascripts/asdf.js", function(){
		page.evaluate($_.F.curry(function(obj){
			var form = document.querySelector(obj.form);
			console.log(form);
			if(!form) throw new Error('fillForm()');
			Asdf.O.each(obj.values, function(v,k){
				var el = Asdf.Element.find(document,k)[0];
				if(el){
					Asdf.Element.value(el, v);
				}
			});
			form.submit();
		}), obj);
		if(!completed)
			onSuccess(page);
		completed = true;
	});
}
module.exports.waitFor = waitFor;
module.exports.waitForUrl = waitForUrl;
module.exports.fillForm = fillForm;
module.exports.step = step();
module.exports.pageOpen = pageOpen;
module.exports.dump = dump;
