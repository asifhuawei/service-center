//Copyright 2017 Huawei Technologies Co., Ltd
//
//Licensed under the Apache License, Version 2.0 (the "License");
//you may not use this file except in compliance with the License.
//You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS IS" BASIS,
//WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//See the License for the specific language governing permissions and
//limitations under the License.
'use strict';
angular.module('serviceCenter.sc')
	.controller('schemaController',['$scope', 'apiConstant', 'httpService', '$stateParams', 'servicesList', '$q', '$mdDialog', 'YAML', '$http', '$state', '$document', '$interval',
		function($scope, apiConstant, httpService, $stateParams, servicesList, $q, $mdDialog, YAML, $http, $state, $document, $interval) {
		
		var serviceId = $stateParams.serviceId;
		$scope.schemaName = [];
        var addresses = [];
        var instances = [];
        var promises = [];
		if(servicesList && servicesList.data && servicesList.data.services){
			servicesList.data.services.forEach(function(services){
	            if(services.serviceId == serviceId){
	                $scope.schemaName = services.schemas || [];
	            }
        	});
		}

		$scope.downloadAllSchema = function(){
		    $(".loader").show();
			for(var s= 0; s < $scope.schemaName.length; s++){
				var schemaApi = apiConstant.api.schema.url;
				var api = schemaApi.replace("{{serviceId}}", serviceId);
				var url = api.replace("{{schemaId}}", $scope.schemaName[s]);
				var method = apiConstant.api.schema.method;
				var headers = {"X-ConsumerId": serviceId};
				promises.push(httpService.apiRequest(url, method, null, headers, "nopopup"));
			}

			$q.all(promises).then(function(response){
				if(response){
					promises = [];
					for(var i = 0; i < response.length; i++){
						$scope.schemaJson = YAML.parse(response[i].data.schema);
						var schemaName = $scope.schemaName[i].split('.');
						var id = schemaName[schemaName.length - 1];
						const ui = SwaggerUIBundle({
						  spec: $scope.schemaJson,
					      dom_id: '#'+id,
					      presets: [
					        SwaggerUIBundle.presets.apis,
					        SwaggerUIStandalonePreset
					      ],
					      plugins: [
					        SwaggerUIBundle.plugins.DownloadUrl
					      ],
					      layout: "StandaloneLayout",
					      docExpansion: 'full'
						});

						if(i == 0){
							var zip = new JSZip();
							var folder = zip.folder('schemas');
						}

						(function(i){
							var interval = $interval(function(){
								if(angular.element('.swagger-ui').length){
   									$interval.cancel(interval);
									var schemaName = $scope.schemaName[i].split('.');
									var fileName = schemaName[schemaName.length - 1];
									var content = $document[0].getElementById('multipleTemplate').innerHTML;
									zip.file(fileName+".html", content);
									var clearDom = angular.element(document.querySelector('#'+fileName));
									clearDom.empty();
									if(i == response.length - 1){
									    $(".loader").hide();
										zip.generateAsync({type: "blob"}).then(function(content) {
											saveAs(content, "schemas.zip");
										})
									}
								}
							},500)
						})(i);
					}
				}
			},function(error){
			    $(".loader").hide();
				$scope.noSchemaFound();
			})
		}

		$scope.instanceDetails = function(){
			var instanceUrl = apiConstant.api.instances.url;
			var instanceApi = instanceUrl.replace('{{serviceId}}', serviceId);
			var instanceMethod = apiConstant.api.instances.method;
			var instanceHeaders = {"X-ConsumerId": serviceId};
			httpService.apiRequest(instanceApi, instanceMethod, null, instanceHeaders, "nopopup").then(function(response){
			  if(response && response.data && response.data.instances) {
					for(var i = 0; i < response.data.instances.length; i++){
						addresses[i] = [];
						instances.push(response.data.instances[i].hostName + '-' +response.data.instances[i].instanceId);
						for(var j = 0; j< response.data.instances[i].endpoints.length; j++){
							addresses[i].push(response.data.instances[i].endpoints[j])
						}
					}
			  }
			  else {
			  	addresses = [[]];
			  }
			},function(error){
				addresses = [[]];
			});
		}
		$scope.instanceDetails();

		$scope.downloadSchema = function(selectedSchema){
		    $(".loader").show();
	    	var schemaApi = apiConstant.api.schema.url;
			var api = schemaApi.replace("{{serviceId}}", serviceId);
			var url = api.replace("{{schemaId}}", selectedSchema);
			var method = apiConstant.api.schema.method;
			var headers = {"X-ConsumerId": serviceId};
			httpService.apiRequest(url, method, null, headers, "nopopup").then(function(response){
				if(response && response.data && response.data.schema){
					$scope.template = response.data.schema;
					$scope.json = YAML.parse($scope.template);
					const ui = SwaggerUIBundle({
						  spec: $scope.json,
					      dom_id: '#swagger-template',
					      presets: [
					        SwaggerUIBundle.presets.apis,
					        SwaggerUIStandalonePreset
					      ],
					      plugins: [
					        SwaggerUIBundle.plugins.DownloadUrl
					      ],
					      layout: "StandaloneLayout",
					      docExpansion: 'full'
					});

					var interval = $interval(function(){
                        if(angular.element('.swagger-ui').length){
                            $(".loader").hide();
                            var content = $document[0].getElementById('singleTemplate').innerHTML;
                            var blob = new Blob([ content ], { type : "text/html;charset=utf-8" });
                            var link = angular.element('<a></a>');
                            link.attr('href', window.URL.createObjectURL(blob));
                            link.attr('download', selectedSchema+".html");
                            link[0].click();
                            $interval.cancel(interval);
                            var clearDom = angular.element(document.querySelector('#swagger-template'));
                            clearDom.empty();
                        }
                    },500)
				}
			},function(error) {
			    $(".loader").hide();
                $scope.noSchemaFound()
			});
		};

	    $scope.noSchemaFound = function(){
	        $mdDialog.show({
                template: `<md-dialog flex="30">
                             <md-toolbar>
                                 <div class="md-toolbar-tools">
                                    <h2>{{ "alert" | translate }}</h2>
                                    <span flex></span>
                                    <md-button class="md-icon-button" ng-click="cancel()">
                                      <md-icon class="glyphicon glyphicon-remove" aria-label="Close dialog"></md-icon>
                                    </md-button>
                                  </div>
                             </md-toolbar>
                             <md-dialog-content>
                                <h3 class="text-center" style="margin-top:15px;">{{ "noSchemaAvailableToDownload" | translate }}</h3>
                             </md-dialog-content>
                             <md-dialog-actions layout="row">
                                <span flex></span>
                                <md-button ng-click="cancel()">
                                 {{ "close" | translate }}
                                </md-button>
                              </md-dialog-actions>
                            </md-dialog>`,
                parent: angular.element(document.body),
                clickOutsideToClose: true,
                controller: function($scope, $mdDialog) {
                    $scope.cancel = function(){
                        $mdDialog.hide();
                    }
                }
            })
	    };

		$scope.testSchema = function(selectedSchema) {
			$mdDialog.show({
		      controller: function ($scope, $mdDialog, apiConstant, httpService) {
		      		$scope.showSchema = false;

				    $scope.instances = instances;
				    $scope.selectedInstance =  instances[0] || '';

				    $scope.addresses = addresses[0];
				    $scope.selectedAddress = addresses[0][0] || '';

				    $scope.setInstance = function(instance) {
				    	for(var i = 0; i < $scope.instances.length; i++){
				    		if(instance == $scope.instances[i]){
				    			$scope.selectedInstance = instance[i];
				    			$scope.addresses = addresses[i];
				    			$scope.selectedAddress = addresses[i][0];
				    		}
				    	}

				    };

				    $scope.setAddress = function(address) {
				    	$scope.selectedAddress = address;
				    };

				    $scope.getSchema = function(){
				    	var schemaApi = apiConstant.api.schema.url;
						var api = schemaApi.replace("{{serviceId}}", serviceId);
						var url = api.replace("{{schemaId}}", selectedSchema);
						var method = apiConstant.api.schema.method;
						var headers = {"X-ConsumerId": serviceId};
						httpService.apiRequest(url, method, null, headers, "nopopup").then(function(response){
							$(".loader").hide();
							if(response && response.data && response.data.schema){
								if($scope.selectedAddress.indexOf("rest") != -1){
				    				var rest = $scope.selectedAddress.split(':');
				    				var ip = rest[1].substring(2,rest[1].length)+":"+rest[2].substring(0,4);
				    			}
				    			if($scope.selectedAddress.indexOf("highway") != -1){
				    				var highway = $scope.selectedAddress.split(':');
				    				var ip = highway[1].substring(2,highway[1].length)+":"+highway[2].substring(0,4);
				    			}
								var schema = response.data.schema;
								var json = YAML.parse(schema);
								json.basePath = "/testSchema";
								json.instanceIP = ip;
								json.schemaName = selectedSchema;
								var yamlString = YAML.stringify(json);
								$scope.testSchema = yamlString;
								$scope.showSchema = true;
							}
						},function(error) {
							$(".loader").hide();
							$scope.showSchema = true;
						});
				    }

					$scope.hide = function() {
				      $mdDialog.hide();
				    };

				    $scope.cancel = function() {
				      $mdDialog.cancel();
				    };
			  },
		      templateUrl: 'scripts/modules/serviceCenter/views/testSchema.html',
		      parent: angular.element(document.body),
		      clickOutsideToClose:true,
		      fullscreen: false
		    });
		};

		
}]);