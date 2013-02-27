var DEBUG = true;

var log = function() {
	if(DEBUG && window.console) {
		// http://stackoverflow.com/a/14250078
		var i = -1, l = arguments.length, args = [], fn = 'console.log(args)';
		while(++i<l) {
			args.push('args['+i+']');
		}
		fn = new Function('args',fn.replace(/args/,args.join(',')));
		fn(arguments);
	}
};
