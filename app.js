'use strict';

const apiai = require('apiai');
const config = require('./config');
const express = require('express');
const xmlrpc = require('xmlrpc');
const rpc = require('./rpc.js');
const jsonToxml = require('./jsonToXmlParser.js');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');
const qsr= require('./qsr-apis.js');
const jwtdecode = require('jwt-decode');
const {dialogflow, Permission} = require('actions-on-google');
const aiapp = dialogflow();
const app = express();
var recommendedName;
var access_token;
var refresh_token;
var text = '';
var cardId;
var cartId;
var storeName;
var storeId;
var address;
var orderCode;
var messageData = '';
var email; //= 'mickeyd.mcd321@gmail.com';
var password; //= 'mickeyd.mcd321@gmail.com';
var shortCode;
var totalItems;
var entries;
var xmlFile;
debugger;


if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
	throw new Error('missing API_AI_CLIENT_ACCESS_TOKEN');
}
if (!config.SERVER_URL) { //used for ink to static files
	throw new Error('missing SERVER_URL');
}


app.set('port', (process.env.PORT || 4984))

//serve static files in the public directory
app.use(express.static('public'));

// Process application/json
app.use(bodyParser.json());

const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
	language: "en",
});

const sessionIds = new Map();

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})


// function postXMLtoRPCService (storeId, orderCode, shortCode) {
// 	console.log('postXMLtoRPCService');
// 			qsr.settingOrbIdToOrderService(storeId, orderCode, shortCode, (error, orbIdResult) => {
// 				if(error){
// 					console.log(error);
// 				}else {
// 					console.log(orbIdResult);
// 				}
// 			});
// 	};

// function jsonToxmlService (orderCode, shortCode, entries, totalItems){

// jsonToxml.xmlData(orderCode, shortCode, entries, totalItems, (error, dataResult) => {
// 	if(error) {
// 		console.log(error);
// 	} else {
// 		console.log(dataResult);
// 		//setTimeout(() => postXMLtoRPCService(dataResult), 5000);
// 	 	}
// 	});
// };


app.post('/webhook/', (req, res) => {

	//console.log(access_token);
	//console.log(JSON.stringify(req.body));
	var data = req.body;
	var sessionId = req.body.sessionId;
	var actionName = req.body.result.action;
 	var parameters = req.body.result.parameters;
 	var message = req.body.result.resolvedQuery;
	switch (actionName) {

			case 'require_permission': {
		 					console.log('In user sign in');
		 					if(isDefined(actionName)){
								console.log('Coversation');
								messageData = {
									"data": {
										"google": {
										"expectUserResponse": true,
										"systemIntent": {
										"intent": "actions.intent.SIGN_IN",
										"data": {}
										         }
										       }
										 }
									}
								res.send(messageData);
							     }
							}
		 				break;



			case 'check_sign_in': {

				if(isDefined(actionName)){
						//console.log(JSON.stringify(req.body));
						var token=req.body.originalRequest.data.user.idToken;
						var decoded = jwtdecode(token);
						var permissions = [];
						var permission;
						//console.log(JSON.stringify(decoded));
						if(decoded.iss == 'https://accounts.google.com'){
						email=decoded.email;
						password=decoded.email;
						console.log(email+'   '+password)
						}
						var surfaces=req.body.originalRequest.data.availableSurfaces[0].capabilities;
						console.log(surfaces);
						 surfaces.forEach(function(surface) {
							 permissions.push(surface.name);
							});
							console.log(permissions)
							if(permissions.includes('actions.capability.SCREEN_OUTPUT', 0)){
								permission= 'DEVICE_PRECISE_LOCATION'
							}else {
								permission= 'DEVICE_COARSE_LOCATION'
							}
									messageData = {
										 "data": {
													"google": {
														"expectUserResponse": true,
														"systemIntent": {
												"intent": "actions.intent.PERMISSION",
												"data": {
													"@type": "type.googleapis.com/google.actions.v2.PermissionValueSpec",
													"optContext": "To process your order, ",
													"permissions": [
																	permission
																					]
																	}
														}
													}
												}
										}

						 	console.log('In require_permission for location');
		 					qsr.getAuthTokenService(email, password, (error, result) => {
									if(error){
										console.log("Token cannot be generated");
									} else {
										access_token = result.token;
										refresh_token = result.refresh_token;
									}
								});
							}
							res.send(messageData);
						}
		 				break;

			case 'check_permission': {
							 console.log('In check_permission');
							 if(isDefined(actionName)){
								 var uLat;
								 var uLng;
								//console.log(JSON.stringify(req.body));
								if(req.body.originalRequest.data.inputs[0].arguments[0].boolValue){
									if(req.body.originalRequest.data.user.permissions[0] == 'DEVICE_COARSE_LOCATION'){
										var zip=req.body.originalRequest.data.device.location.zipCode;
										qsr.getGpsFromZipService(zip, (error, zipResult) => {
											if(error){
												console.log(error);
											} else {
												uLat=zipResult.sLat;
												uLng=zipResult.sLng;
											}
											});
									} else {

										  uLat=req.body.originalRequest.data.device.location.coordinates.latitude; // = 41.8834;
										  uLng=req.body.originalRequest.data.device.location.coordinates.longitude; // = -87.6537;
									}
								
								
								
							qsr.nearestStoreService(uLat, uLng, (error, storeResult) =>{
									if(error){
										console.log(error);
									}else {

										storeId=storeResult.storeId;
										storeName=storeResult.storeName;
										qsr.calculateDistanceService(uLat, uLng, storeResult.sLat, storeResult.sLng, (error, durationResult) =>{
											if(error){
												console.log(error);
											}else {
												console.log(durationResult.duration);
												qsr.createCartService(access_token, email, (error,cartResult) =>{
												if(error){
													console.log(error);
												}else {
													cartId=cartResult.cartId;
													qsr.settingDeliveryModeService(access_token, cartId, email, (error,result)=> {
 						 							if(error){
 													console.log(error);
 													}else {
													console.log(result);
														}
													});
													}
												});
												text= `Thank you for your permission ! I can place an order for you at the nearest ${storeResult.name} at ${storeResult.address}, which is a ${durationResult.duration} walk from your place. What would you like to order ?`;
												messageData = {
														speech: text,
														displayText: text
														}
													res.send(messageData);
											}
										});
									};
								});

								}else{
								text= 'I am sorry ! I cannot process your order without your permission';
								messageData = {
										speech: text,
										displayText: text
										}
								res.send(messageData);
								}
							}
				 		}
				 		break;

		 case 'productsOrderMac': {
					console.log('In action products order');
					var productName = req.body.result.contexts[0].parameters.productName;
					if(isDefined(actionName)){
						console.log("Access Token  generated-  "+access_token+"for- "+productName);
						console.log(cartId);
						function myNewFunc(productName, recommendedName) {
							text= `Okay ! I have ordered you a ${productName}, would you also like to order ${recommendedName}?`;
										messageData = {
											speech: text,
											displayText: text
											}
										res.send(messageData);
						};
						
						function myNextFunc() {
							text= 'Would you like to order anything else ?';
							messageData = {
									speech: text,
									displayText: text
									}
							res.send(messageData);
						
						};
						qsr.getRecommendedProductService(productName, (error, result) => {
							if(error){
								console.log(error);
							} else if(result.name == 'no product') {
								console.log('Recommended products API null');
								qsr.getProductCodeByNameService(productName, (error, prodResult) =>{
									if(error){
										console.log(error);
									}else if(prodResult.productCode == 'no product') {
										console.log('Product is not there');
										text= 'I am sorry ! This item does not exist! What would you like to order?';
										messageData = {
											speech: text,
											displayText: text
											}
										res.send(messageData);
									} else{
										console.log('code for product ',prodResult.productCode);
										qsr.addProductsToCart(access_token, cartId, email, prodResult.productCode, storeName, (error,nextProductResult)=> {
											if(error){
												console.log(error);
											}else {
												console.log(nextProductResult);
											}
											text= 'Would you like to order anything else ?';
												messageData = {
														speech: text,
														displayText: text
														}
												res.send(messageData);
										});
									}
								});

							} else {
								recommendedName=result.name;
								console.log(result.name + "   " +recommendedName)
								qsr.getProductCodeByNameService(productName, (error, prodResult) =>{
									if(error){
										console.log(error);
									}else if(!(prodResult.productCode)) {
										console.log('Product is not there');
										text= 'I am sorry ! This item does not exist! What would you like to order?';
										messageData = {
											speech: text,
											displayText: text
											}
										res.send(messageData);
									} else{
										console.log('code for product ',prodResult.productCode);
										qsr.addProductsToCart(access_token, cartId, email, prodResult.productCode, storeName, (error,productResult)=> {
											if(error){
												console.log(error);
											}else {
												console.log('Mac added ');
												// setTimeout(() => myNewFunc(productName, recommendedName), 3000);
											}
										});
									}
								});
								setTimeout(() => myNewFunc(productName, recommendedName), 4000);
							}
						});

						}else{
							text= 'I am sorry ! I cannot process your order.';
							messageData = {
									speech: text,
									displayText: text
									}
							res.send(messageData);
					   	}
					}
					break;
			
		case 'ordermoreProductsFollowUp': {
 					console.log('In action order more products anything else');
 					if(isDefined(actionName)){
 						text= `What else would you like to have ?`;
								messageData = {
									speech: text,
									displayText: text
										}
								    res.send(messageData);
								}
							 }
 					     break;


 		 case 'productsOrderFries': {
 					console.log('In action products order Fries');
 					if(isDefined(actionName)){
 						console.log(cartId);
						qsr.getProductCodeByNameService(recommendedName, (error, prodResult) => {
							if(error){
 							console.log(error);
 							} else if(!(prodResult.productCode)) {
								console.log('Product is not there');
								text= 'I am sorry ! This item does not exist! What would you like to order?';
								messageData = {
									speech: text,
									displayText: text
									}
								res.send(messageData);
							}else {
								console.log('code for product ',prodResult.productCode);
 								qsr.addProductsToCart(access_token, cartId, email, prodResult.productCode, storeName, (error,result)=> {
								 if(error){
									console.log(error);
									}else {
										console.log('Fries added');
											}
										   });
 									}
						});

								text= `Okay, I've added a ${recommendedName} to your order. Anything else ?`;
								messageData = {
									speech: text,
									displayText: text
										}
								    res.send(messageData);
								}
							 }
 					     break;


		case 'productsOrderConfirmedCart': {
 					console.log('In action productsOrderConfirmedCart');
 					if(isDefined(actionName)){
 						qsr.fetchCartService (access_token, cartId, email, (error,result)=> {
						 	if(error){
								console.log(error);
							}else {
								console.log(result.totalPrice);
								qsr.gettingSavedCardDetailsService(access_token, email, (error, cardResult)=>{
									if(error){
										console.log(error);
									}else {
										cardId= cardResult.cardId;
 										qsr.addCardPaymentService(access_token, cartId, email, cardId, (error, paymentResult)=>{
 											if(error){
 												console.log(error);
 											 }else {
 												console.log('Payment details added with storeId: ',storeId);
 									 	 	 }
 										 });
									 	 var defCardNumber=cardResult.cardNumber;
									 	 text= `The total will be ${result.totalPrice} $. Would you like to use your default card on file ending with ${defCardNumber.substr(12,4)}?`;
									  	messageData = {
									   		speech: text,
									  		 displayText: text
											}
								              res.send(messageData);
									 }
								  });
						 	 }
						   });
						}
					 }
 					         break;

		case 'OrderConfirmed': {
 					console.log('In action OrderConfirmed');
					if(isDefined(actionName)){
 						console.log(cartId+'   '+cardId);
						function myFunc() {
							text= `Your order has been submitted.I will text it to you for reference.Please provide this code to get your order started.Thank you for your order!`
								 messageData = {
										speech: text,
										displayText: text
										}
								res.send(messageData);
						};
						qsr.placeOrderService(access_token, cartId, email, storeId, (error, orderResult) =>{
							if(error){
								console.log(error);
							}else{
								console.log(orderResult.code);
								orderCode=orderResult.code;
								qsr.gettingOrbIdFromOrderService(storeId, orderResult.code, (error, orbIdResult) => {
											if(error){
												console.log(error);
											}else {
												console.log(orbIdResult.displayCode);
												setTimeout(() => myFunc(), 5000);
											}
									});
								}
							});
						}else{
 						text= 'I am sorry, I was not able to place an order for you.';
							 messageData = {
									speech: text,
									displayText: text
									}
							 res.send(messageData);
					 	}
					}
 					break;

 		 default:
 			//unhandled action, just send back the text
 			break;
	}
});


function isDefined(obj) {
	if (typeof obj == 'undefined') {
		return false;
	}

	if (!obj) {
		return false;
	}

	return obj != null;
}

// Spin up the server
app.listen(app.get('port'), function () {
	console.log('running on port', app.get('port'))
})
