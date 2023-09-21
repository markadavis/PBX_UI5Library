sap.ui.define([
    "sap/ui/core/Control",
    "sap/base/Log",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/resource/ResourceModel",
    "sap/m/MessageBox"
], function (Control, Log, JSONModel, ODataModel, ResourceModel, MessageBox) {
    "use strict";

    return Control.extend("com.publix.ui5library.pm.storeSelector.map.StoreMapper", {
        _scriptsLoaded: null, _oMap: null, _oMarker: null, _oGeoCoder: null, _centerChangedTimerId: null,

        metadata: {
            properties: {
                /**
                 * Externalize the key in order to get it from parameters (maybe OData).
                 */
                "key": {
                    "type": "string",
                    "defaultValue": "AIzaSyAv4H7LlHo-FcGCHRTgQ8c7U1SNRhVTACs"  // TODO  !!!  THIS IS MARK'S API KEY - REMOVE BEFORE USING  !!!
                },
                "latitude": {
                    "type": "float",
                    "default": 0
                },
                "longitude": {
                    "type": "float",
                    "default": 0
                },
                "positionIP": {
                    "type": "string",
                    "default": ""
                },
                "address": {
                    "type": "string",
                    "defaultValue": ""
                },
                "defaultAddress": {
                    "type": "string",
                    "defaultValue": ""
                },
                "title": {
                    "type": "string",
                    "defaultValue": ""
                },
                "description": {
                    "type": "string",
                    "defaultValue": ""
                },
                /**
                 * Google Container
                 * width : Map width
                 * height : Map height
                 */
                "width": {
                    "type": "sap.ui.core.CSSSize",
                    "defaultValue": "100%"
                },
                "height": {
                    "type": "sap.ui.core.CSSSize",
                    "defaultValue": "600px"
                },
                "backgroundColor": {
                    "type": "sap.ui.core.CSSColor",
                    "defaultValue": "#C6BEBE"
                },
                /**
                 * Google Variables
                 * @link(https://developers.google.com/maps/documentation/javascript/examples/map-simple)
                 */
                "mapType": {
                    "type": "string",
                    "defaultValue": "roadmap"
                },
                "mapZoom": {
                    "type": "int",
                    "defaultValue": 17
                }
            },
            events:{
                centerChanged: {},  // After the map center has changed
                mapClicked: {}      // After the user clicks on the map
            },
            aggregations: {}
        },


        /* =========================================================== */
		/*  Lifecycle methods                                          */
		/* =========================================================== */

        init: function() {
            this.logger = Log.getLogger("com.publix.ui5library.pm.storeSelector.map.StoreMapper");

            const sImagesUri = jQuery.sap.getModulePath("com.publix.ui5library.pm.storeSelector.images") + ".json";
            this.imageModel = new JSONModel({});
            this.imageModel.loadData(sImagesUri);

            this.storeModel = new ODataModel({
                serviceUrl: "/sap/opu/odata/sap/zfiori_service_tech_srv"
            });

            this._oResourceModel = new ResourceModel({
				bundleName: "com.publix.ui5library.pm.storeSelector.i18n.StoreSelector"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

            this.setDescription(this._oResourceBundle.getText("storeMapper_apiDescription"));
            this.setTitle(this._oResourceBundle.getText("storeMapper_dialogTitle"));
            this.setDefaultAddress(this._oResourceBundle.getText("storeMapper_defaultAddress"));

            this._scriptsLoaded = this._loadScripts().catch(this._showError.bind(this));
        },

        renderer: function(oRm, oControl) {
            //Load Styles - TODO externalise this CSS/LESS
            const sGlobalStyle = `width:${oControl.getWidth()};height:${oControl.getHeight()};background:${oControl.getBackgroundColor()}`,
                sLoadingStyle = `color:#A09494;text-align:center;font-size:1rem;padding-top:2rem`;

            //   Target
            //   <div id='idMapLoading' style='width:100%;height:400px;background:#C6BEBE'>
            //  	<h1>Loading ...</h1>
            //   </div>
            oRm.write('<div');
            oRm.writeControlData(oControl);
            oRm.writeAttributeEscaped("style", sGlobalStyle);
            oRm.write('><h1');
            oRm.writeAttributeEscaped("style", sLoadingStyle);
            oRm.write(`>${oControl.getTitle()}</h1>`)
            oRm.write('</div>')
        },

        onAfterRendering: function(oEvent) {
            // No API Key, No Google Map!
            if (!this.getKey()) {
                this._showError('The Google API key is required.');
                return;
            }

            this._scriptsLoaded.then(() => {
                this._displayAddress();
            });
        },



        /* =========================================================== */
		/*  Public methods                                             */
		/* =========================================================== */

        getPositionFromIP: function(sIpAddress) {
            return new Promise((fnResolve, fnReject) => {
                if (!sIpAddress) {
                    sIpAddress = this.getPositionIP();
                    if (!sIpAddress) {
                        return {
                            latitude: 0,
                            longitude: 0
                        };
                    }
                }

                try {
                    let sUrl = `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.getKey()}`;
                    // TODO maybe remove jQuery and replace with JS 'fetch'.
                    $.ajax({
                        url: sUrl,
                        data: JSON.stringify({ "considerIp": "true" }),
                        type: 'POST',
                        contentType: 'application/json',
                        success: (oResponse) => {
                            if(oResponse.location) {
                                fnResolve({
                                    latitude: oResponse.location.lat,
                                    longitude: oResponse.location.lng
                                });
                            } else {
                                let oError = new Error("storeMapper_apiUnableToResolveIP");
                                this.logger.error(oError.message, "com.publix.ui5library.pm.storeSelector.map.StoreMapper.getPositionFromIP()");
                                fnReject(oError);
                            }
                        },
                        error: (oError) => {
                            this.logger.error(oError.message, "com.publix.ui5library.pm.storeSelector.map.StoreMapper.getPositionFromIP()");
                            fnReject(oError);
                        }
                    });
                } catch(oError) {
                    this.logger.error(oError.message, "com.publix.ui5library.pm.storeSelector.map.StoreMapper.getCurrentPosition()");
                    fnReject(oError);
                }
            });
        },

        search: function(sQuery) {
            return new Promise((fnResolve, fnReject) => {
                try {
                    // google.maps.places.Place.searchByText({
                    let oPlace = new google.maps.places.PlacesService(this._oMap);
                    oPlace.textSearch({
                        query: sQuery,
                        type: "store"
                    }, (aPlaces, sStatus) => {
                        if (sStatus == google.maps.places.PlacesServiceStatus.OK ) {
                            // TODO - Do Something...
                            fnResolve(aPlaces);
                        } else {
                            let oError = new Error(this._oResourceBundle.getText("storeMapper_apiSearchNotFound", [sQuery]));
                            this._showError(oError);
                            fnReject(oError)
                        }
                    });
                } catch(oError) {
                    this._showError(oError);
                    fnReject(oError);
                }
            });
        },



        /* =========================================================== */
		/*  Private methods                                            */
		/* =========================================================== */

        _loadScripts: function() {
            const sApiUrl = `https://maps.googleapis.com/maps/api/js?key=${this.getKey()}&libraries=places`;

            return new Promise(function (fnResolve, fnReject) {
                try {
                    // Check to see if it already exists - Load it only once!
                    if (google) {
                        fnResolve();
                    }
                } catch (oError) {
                    // If Google library was not loaded we get something like a 'ReferenceError'
                    // Try to load the Google API
                    if (oError instanceof ReferenceError) {
                        // TODO maybe remove jQuery and replace with JS 'fetch'.
                        $.getScript(sApiUrl).done((sScript, sStatus) => {
                            fnResolve();
                        }).fail((jqxhr, oSettings, oException) => {
                            fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiUnableToLoad")));
                        });
                    } else {
                        fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiUnableToLoad")));
                    }
                }
            })
        },

        _getMap(oConfig) {
            let oLocation = {
                lat: this.getLatitude(),
                lng: this.getLongitude()
            };

            this._oMap = null;

            // Create the map.
            this._oMap = new google.maps.Map(this.getDomRef(), {
                center: oLocation.lat && oLocation.lng ? oLocation : null,
                zoom: this.getMapZoom(),
                mapTypeId: this.getMapType(),
                mapTypeControl: false,
                streetViewControl: false,
                scaleControl: false,
                fullscreenControl: false
            });

            // Set the default location marker.
            if (oLocation.lat && oLocation.lng) {
                this._oMarker = new google.maps.Marker({
                    map: this._oMap,
                    position: oLocation,
                    title: this.getAddress(),
                    icon: this.imageModel.getProperty("/img/publixMapPin.png"),
                    animation: google.maps.Animation.DROP
                });
            }

            /* Add the Map event listeners */
            // Center Changed
            this._oMap.addListener("center_changed", (oEvent) => {
                // 5 seconds after the center of the map has changed, pan back to the marker.
                if (this._centerChangedTimerId) {
                    clearTimeout(this._centerChangedTimerId);
                }
                this._centerChangedTimerId = window.setTimeout((oEvent) => {
                    this._onCenterChanged(oEvent);
                }, 5000);
    
            });

            // Map Clicked
            this._oMap.addListener("click", (oEvent) => {
                this._onMapClicked(oEvent);
            });

            return this._oMap;
        },

        _onCenterChanged: function(oEvent) {
            this._oMap.panTo(this._oMarker.getPosition());
            this._oMap.setZoom(this.getMapZoom());

            this.fireCenterChanged(oEvent);
        },

        _onMapClicked: function(oEvent) {
            let oCoordinates = oEvent.latLng,
                sPlaceId = oEvent.placeId;

            this._oMap.setZoom(13);
            this._oMap.setCenter(oCoordinates);

            this.fireMapClicked(oEvent);
        },

        _showError: function(oError) {
            const sMessage = typeof(oError) === "string" ? oError : oError.message;
            MessageBox.error(sMessage);
        },

        _displayAddress: function() {
            const fnLookup = (sAddress) => {
                // Get the Geo Location info for the given address.
                const oSearchAddress = new Promise((fnResolve, fnReject) => {
                    if (!this._oGeoCoder) {
                        this._oGeoCoder = new google.maps.Geocoder();
                    }
                    this._oGeoCoder.geocode({
                        address: sAddress
                        //location: oCoordinates
                        //placeId: sPlaceId
                    }, (oResults, sStatus) => {
                        if (sStatus == google.maps.GeocoderStatus.OK) {
                            this.setAddress(sAddress);
                            this.setLatitude(oResults[0].geometry.location.lat());
                            this.setLongitude(oResults[0].geometry.location.lng());
                            fnResolve();
                        } else {
                            fnReject(new Error(this._oResourceBundle.getText("storeMapper_apiSearchNotFound", [sAddress])));
                        }
                    });
                });

                // Launch the address lookup and return control to the Mapper.
                oSearchAddress
                    .then(this._showMap.bind(this))
                    .catch(this._showError.bind(this));            
            };

            if (!this.getLatitude() || !this.getLongitude()) {
                let sAddress = this.getAddress();
                if (sAddress) {
                    fnLookup(sAddress);
                } else {
                    this.search(this._oResourceBundle.getText("storeMapper_apiDefaultSearch")).then(aPlaces => {
                        let oPlace = aPlaces.length > 0 ? aPlaces[0] : null;
                        sAddress = oPlace ? oPlace.formatted_address : "";
                        if (sAddress) {
                            this._oMarker.setTitle(oPlace.name || "Publix");
                            fnLookup(sAddress);
                        }
                    }).catch(oError => {
                        // TODO - log error view in dialog.
                    });
                }
            } else {
                this._showMap();
            }
        },

        _showMap: function() {
            let oLocation = {
                lat: this.getLatitude(),
                lng: this.getLongitude()
            };

            let oMap = this._getMap();

            // Center the Map on the default location.
            oMap.setCenter(oLocation);
        }
    });
});