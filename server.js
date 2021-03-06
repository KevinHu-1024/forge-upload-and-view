/////////////////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Jaime Rosales 2016 - Forge Developer Partner Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////////////////

//var favicon = require('serve-favicon');
//libs
var express = require('express');
var  hbs = require('hbs');
var multer = require('multer');
var path = require('path');
var fs = require('fs');

//imports
var oauth = require('./routes/oauth');
var uploadPath = path.join(__dirname, '../www/uploads');
var forge = require('./forge');

var app = express();

//multer setting
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
var upload = multer({ storage: storage });  

app.set('port', process.env.PORT || 3000);
app.use('/', express.static(__dirname + '/www'));
//app.use(favicon(__dirname + '/www/images/favicon.ico'));
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('views', __dirname + '/views');

// /////////////////////////////////////////////////////////////////////////////////
// //
// // Use this route for proxying access token requests
// //
// /////////////////////////////////////////////////////////////////////////////////

app.use('/oauth', oauth);

//----------------------------------------------------------------------------------
//upload route
app.post('/', upload.single('file'), function (req, res, next) {
    var uploadFile = req.file.filename;
    var uploadPath = req.file.path;

    console.log('**** Multer uploading file: ' + req.file.filename);
    console.log('**** Multer uploading to: ' + req.file.path);

    forge.process(uploadFile, uploadPath);
    
});


//Get viewer 
app.get('/view', function (req, res) {

    var urn = forge.viewDetails.urn;

    res.render('viewer', {'urn': urn});
});

app.get('/urn', function (req, res) {
    // fs.readFileSync('./savedUrn.json', 'utf-8', function (err, data) {
    //     if (err) throw err;
    //     return obj = JSON.parse(data);
    // });
    // console.log('sending urn: ', obj);

    // res.sendStatus(200).send(obj);
    var obj = JSON.parse(fs.readFileSync('./savedUrn.json', 'utf8'));
    res.send(obj);
});

//----------------------------------------------------------------------------------

var server = app.listen(app.get('port'), function() {
    console.log('Server listening on port ' + server.address().port);
});

//route to view model here