sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/model/resource/ResourceModel",
    "sap/m/MessageBox"
], function (Control, ResourceModel, MessageBox) {
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
                    "type": "string",
                    "default": ""
                },
                "longitude": {
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

        init: function() {
            this._oResourceModel = new ResourceModel({
				bundleName: "com.publix.ui5library.pm.storeSelector.i18n.StoreSelector"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();

            this.setDescription(this._oResourceBundle.getText("storeMapper_apiDescription"));
            this.setTitle(this._oResourceBundle.getText("storeMapper_dialogTitle"));
            this.setDefaultAddress(this._oResourceBundle.getText("storeMapper_defaultAddress"));

            const sApiUrl = `https://maps.googleapis.com/maps/api/js?key=${this.getKey()}&libraries=places`;
            this._scriptsLoaded = this._loadScript(sApiUrl).catch(this._showError.bind(this));
        },

        renderer: function(oRm, oControl) {
            //Load Styles - TODO externalise this CSS/LESS
            const sGlobalStyle = `width:${oControl.getWidth()};height:${oControl.getHeight()};background:${oControl.getBackgroundColor()}`,
                sLoadingStyle = `color:#A09494;text-align:center;font-size:1rem;padding-top:2rem`;

            //   Target
            //   <div id='idoFThis' style='width:100%;height:400px;background:#C6BEBE'>
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

        onAfterRendering: function() {
            // No API Key, No Google Map!
            if (!this.getKey()) {
                this._showError('The Google API key is required.');
                return;
            }

            this._scriptsLoaded.then(() => {
                this._displayAddress();
            });
        },

        search: function(sQuery) {
            return new Promise((fnResolve, fnReject) => {
                google.maps.places.Place.searchByText({
                    query: sQuery
                }).then(aPlaces => {
                    aPlaces.forEach(oPlace => {
                        // TODO - Do Something...
                    });
                    fnResolve(aPlaces);
                }).catch(oError => {
                    this._showError(oError);
                    fnReject(oError);
                });    
            });
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

        _loadScript: function(sUrl) {
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
                        $.getScript(sUrl).done((sScript, sStatus) => {
                            fnResolve();
                        }).fail((jqxhr, OSettings, oException) => {
                            fnReject(new Error("Error while loading the Google Maps"));
                        });
                    } else {
                        fnReject(new Error("Error while loading the Google Maps"));
                    }
                }
            })
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
                        address: sAddress       //encodeURIComponent(sAddress)
                        //location: oCoordinates
                        //placeId: sPlaceId
                    }, (oResults, sStatus) => {
                        if (sStatus == google.maps.GeocoderStatus.OK) {
                            this.setLatitude(oResults[0].geometry.location.lat());
                            this.setLognitude(oResults[0].geometry.location.lng());
                            fnResolve();
                        } else {
                            fnReject(new Error(`"Address not found:\n${sAddress}"`));
                        }
                    });
                });

                // Launch the address lookup and return control to the Mapper.
                oSearchAddress
                    .then(this._showMap.bind(this))
                    .catch(this._showError.bind(this));            
            };

            if (this.getLatitude() === "" || this.getLongitude() ==="") {
                let sAddress = this.getAddress();
                if (sAddress) {
                    fnLookup(sAddress);
                } else {
                    this.search("Publix Super Market").then(aPlaces => {
                        sAddress = aPlaces.lenght > 0 ? aPlaces[0] : "";
                    }).catch(oError => {
                        // TODO - log error.
                    }).done((oResult) => {
                        fnLookup(sAddress);
                    });    
                }
            } else {
                this._showMap.bind(this);
            }
        },

        _showMap: function() {
            let oDomLocation = this.getDomRef(),
                sMapType = this.getMapType(),
                iZoom = this.getMapZoom(),
                sAddress = this.getAddress(),
                oLocation = {
                    lat: this.getLatitude(),
                    lng: this.getLogitude()
                }

            const oMapOptions = {
                center: oLocation,
                zoom: iZoom,
                mapTypeId: 'roadmap',
                mapTypeControl: false,
                streetViewControl: false,
                scaleControl: false,
                fullscreenControl: false
            }

            // Create the map.
            this._oMap = new google.maps.Map(oDomLocation, oMapOptions);

            // Set the default location marker.
            this._oMarker = new google.maps.Marker({
                map: this._oMap,
                position: oLocation,
                title: sAddress,
                animation: google.maps.Animation.DROP
            });

            // Center the Map on the default location.
            this._oMap.setCenter(oLocation);


            /* *************************** */
            /* Add the Map event listeners */
            /* *************************** */

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
        }
    });
});