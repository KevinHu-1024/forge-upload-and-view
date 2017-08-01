//add forge methods and api call chain here as a function and export it

//libs
var fs = require('fs');
var ForgeSDK = require('forge-apis');

//
var bucketsApi = new ForgeSDK.BucketsApi(); // Buckets Client
var objectsApi = new ForgeSDK.ObjectsApi(); // Objects Client
var derivativesApi = new ForgeSDK.DerivativesApi // Derivatives Client

//credentials for sample app
var CLIENT_ID = 'WQUXGAeIvcGtch2lMMABMGRHGfZQSAv3';
var CLIENT_SECRET = 'jFWBfYTzLeAzbCHG';
var BUCKET_KEY = 'perm-sample-bucket' + CLIENT_ID.toLowerCase();;
var FILE_NAME = 'newpod.3dm';
var FILE_PATH = './models/' + FILE_NAME;

//--------------------------------------------------------------------------------
//API Call methods 

//initialise 2 legged authentication
var oAuth2TwoLegged = new ForgeSDK.AuthClientTwoLegged(CLIENT_ID, CLIENT_SECRET, ['data:write', 'data:read', 'bucket:read','bucket:update','bucket:create', 'viewables:read'], true);

//general Error Handling method
function defaultHandleError(err) {
  console.log('\x1b[31m Error:', err, '\x1b[0m')
}

//get the details of the bucketKey passed in
var getBucketDetails = function (bucketKey) {
  console.log("**** Getting bucket details : " + bucketKey);
  return bucketsApi.getBucketDetails(bucketKey, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

//creates a bucket with the bucket key passed in
var createBucket = function (bucketKey) {
  console.log("**** Creating Bucket : " + bucketKey);
  var createBucketJson = {'bucketKey': bucketKey, 'policyKey': 'temporary'};
  return bucketsApi.createBucket(createBucketJson, {}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

//checks if the bucket exists with 'getBucketDetails', if it doesnt, create the bucket
var createBucketIfNotExsit = function (bucketKey) {
  console.log("**** Creating Bucket if not exist : " + bucketKey);
  
  return new Promise (function(resolve, reject) {
    getBucketDetails(bucketKey).then(function (resp) {
      //bucket already exists - resolve
      resolve(resp);
    }, 
    function (err) {
      if (err.statusCode === 404) {
        //no bucket found by 'getBucket' - create Bucket...
        createBucket(bucketKey).then(function(res) {
          resolve(res);
        },
        function(err) {
          //something went wrong creating the bucket, reject...
          reject(err);
        })  
      } 
      else {
        reject(err);
      }
    });
  });
};

//uploads a file to the bucketKey Passed in
//if the name already exsists, it overwrites it
//returns the object details
var uploadFile = function (bucketKey, filePath, fileName) {
  console.log("**** Uploading file. bucket: " + bucketKey + " filePath: "+filePath);
  
  return new Promise (function (resolve, reject) {
    fs.readFile(filePath, function (err, data) {
      if (err) {
        //problem reading the file
        reject(err);
      }
      else {
        //file successfully read
        objectsApi.uploadObject(bucketKey, fileName, data.length, data, {}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials()).then(
          function(res) {
            resolve(res);
          }, function(err) {
            reject(err);
          }
        )
      }
    });
  });
};

//delete a file
var deleteFile = function(bucketKey, fileName) {
  console.log("**** Deleting file from bucket:" + bucketKey + ", filename:" + filenName);
  return objectsApi.deleteObject(bucketKey, fileName, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

//get Buckets 
var getBuckets = function() {
  console.log("**** Getting all buckets");
  return bucketsApi.getBuckets({}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

//------------------------------ Derivative API methods
//submit a translate job
var translateFile = function(encodedURN){
	console.log("**** Translating file derivative");
	var postJob =
  	{
    	input: {
      		urn: encodedURN
    	},
    	output: {
      		formats: [
        		{
          			type: "svf",
          			views: ["2d", "3d"]
        		}
      		]
    	}
  	};

	return new Promise(function(resolve, reject) {
		derivativesApi.translate(postJob, {}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials()).then(
			function(res){
				resolve(res);
			},function(err){
				reject(err);
			}
		)	
	});
};

var manifestFile = function (encodedURN) {
	
	console.log("**** Getting File Manifest Status");
	
	return new Promise(function(resolve, reject) {
		derivativesApi.getManifest(encodedURN, {}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials()).then(
			function(res){
				if (res.body.progress != "complete"){
					console.log("The status of your file is ") + res.body.status + " Please wait while we finish Translating your file";
        }
        else if (res.body.progress == "complete" && res.body.status == "failed") {
          reject("Translation Failed")
        }
				else {
          console.log("**** Manifest Body", res.body);
					console.log("**** Status", res.body.status);
          console.log("**** Progress", res.body.progress);
					resolve(res);
				}
				
			},function(err){
				reject(err);
			}
		)	
	});
};

var saveUrn = function (urn) {
  var savedUrn = {
    urn: 'urn:' + urn
  }

  var json = JSON.stringify(savedUrn);

  fs.writeFile('savedUrn.json', json, function(err) {
    if (err) throw err;
    console.log('Urn saved to savedUrn.json');
 });
};
//------------------------------------------------------------------------------------------------------------------------------------------------------

var viewDetails = {
  token: '',
  urn: '',
}



//api calls function
var process = function (fileName, filePath) {

  var FILE_NAME = fileName;
  var FILE_PATH = filePath;

  oAuth2TwoLegged.authenticate().then(function(credentials) {
    console.log("**** Got Credentials", credentials);


        //upload the file
        uploadFile(BUCKET_KEY, FILE_PATH, FILE_NAME).then(function(uploadRes){
          console.log("**** Upload file response:", uploadRes.body);
          const urnEncode = new Buffer(uploadRes.body.objectId).toString('base64');

          //translate file with encoded URN
          translateFile(urnEncode).then(function(translateRes) {
            console.log("****Translating file | encoded URN | " + urnEncode);             

            
            manifestFile(urnEncode).then(function(manifestFileRes){

              viewDetails.token = credentials.access_token;
              viewDetails.urn = manifestFileRes.body.urn;

              saveUrn(viewDetails.urn);

              console.log('**** New View Details: ', viewDetails);
						  console.log("**** Your File is ready for viewing"); // the promise resolves then this message prints			
            }, defaultHandleError);           
            
            
            // //check manifest
            // manifestFile(urnEncode).then(function(ManifestFileRes) {
            //   console.log("****Your file is ready for viewing");
              
              
            //   viewDetails.token = credentials.access_token;
            //   viewDetails.urn = ManifestFileRes.body.urn;

            //   console.log("||| View Details ||| ");
            //   console.log("||| Token ||| ", credentials.access_token);
            //   console.log("||| URN ||| ", ManifestFileRes.body.urn);
            //   console.log("*****PROCESS ENDED*******");

              

            // }, defaultHandleError);

          }, defaultHandleError);
        
        }, defaultHandleError);

  }, defaultHandleError);

};

module.exports = {process, viewDetails};