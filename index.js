var pm2 = require('pm2');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.set('view engine', 'html');
app.use(bodyParser());
//app.use(express.static(__dirname + '/View'));
//app.use(express.static(__dirname + '/Script'));

var port = 8080;

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
});

app.get('/test', function(req, res) {
    //TODO: Get list of instances or use hard coded values.
    res.sendFile(__dirname + '/index.html');
    /*
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }
         
        var instances = processDescriptionList.map(function(x) { return x.name; });
        res.render('index', instances, function(err, html) {});
    });
    */
});

app.post('/submit', function(req, res) {
    var body = req.body;
    console.log(body);
    if (body.hasOwnProperty('start')) {
        $.get('/start/' + body.instance, null, function(data) {
			alert(data);
		});
    } else if (body.hasOwnProperty('stop')) {
        $.get('/stop/' + body.instance, null, function(data) {
			alert(data);
		});
    } else if (body.hasOwnProperty('restart')) {
        $.get('/restart/' + body.instance, null, function(data) {
			alert(data);
		});
    }
    res.end();
});

app.get('/list', function(req, res) {
    pm2.list(function(err, processDescriptionList) {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        var instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                uptime:x.pm2_env.pm_uptime,
                status:x.pm2_env.status
            };
        });
        res.write(JSON.stringify(instances));
        res.end();
    });
});

app.get('/start/:name', function(req, res) {
    console.log("Attempting to start", req.params.name);
    pm2.start(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "started successfully.");
            res.write("OK");
        }
              
        res.end();
    });
});

app.get('/stop/:name', function(req, res) {
    console.log("Attempting to stop", req.params.name);
    pm2.stop(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

app.get('/restart/:name', function(req, res) {
    console.log("Attempting to restart", req.params.name);
    pm2.restart(req.params.name, function(err) {
        if (err) {
            console.error(err);
            res.write(err);
        } else {
            console.log(req.params.name, "stopped successfully.");
            res.write("OK");
        }
        
        res.end();
    });
});

var server = app.listen(port, function() {
    var host = server.address().address;
    console.log("Listening on http://%s:%s", host, port);
});


function getInstances() {
    var instances;
    pm2.list(function(err, processDescriptionList) {
        if (err) {
             console.error(err);
             process.exit(2);
        }
         
        instances = processDescriptionList.map(function(x) {
            return {
                name:x.name,
                pid:x.pid,
                cpu:x.monit.cpu,
                mem:x.monit.memory,
                uptime:x.pm2_env.pm_uptime,
                status:x.pm2_env.status
            };
        });
    });
    return instances;
}
