/*
    RangeSlider
    ========================

    @file      : RangeSlider.js
    @version   : 1.4
    @author    : Chad Evans
    @date      : 14 Oct 2015
    @copyright : 2015, Mendix B.v.
    @license   : Apache v2

    Documentation
    ========================
    A Range Slider input control for Mendix. Based on https://github.com/andreruffert/rangeslider.js.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "RangeSlider/lib/jquery-1.11.2",
    "RangeSlider/lib/rangeslider",
    "dojo/text!RangeSlider/widget/template/RangeSlider.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoQuery, dojoClass, dojoStyle,
    dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, _jQuery, _rangeslider, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("RangeSlider.widget.RangeSlider", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        rangeSliderNode: null,
        rangeInputNode: null,

        // Parameters configured in the Modeler.
        valueAttr: "",
        minAttr: "",
        maxAttr: "",
        step: 10,
        stepAttr: "",
        orientation: "horizontal",
        fillClass: "",
        handleClass: "",
        onSlideEndMF: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        $rangeInputNode: null, //jQuery node
        _options: null,
        _initialized: false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            //console.log(this.id + ".postCreate");

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            //console.log(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            if (!this.stepAttr || this.stepAttr === "") {
                dojoProp.set(this.rangeInputNode, {
                    step: this.step
                });
            }
            this._options = {
                orientation: this.orientation,
                polyfill: false,
                fillClass: "rangeslider__fill " + this.fillClass,
                handleClass: "rangeslider__handle " + this.handleClass,
                onSlideEnd: dojoLang.hitch(this, this._onSlideEnd)
            };

            dojoClass.add(this.rangeSliderNode, this.orientation);

            this.connect(this.rangeInputNode, "change", function (e) {
                // Function from mendix object to set an attribute.
                this._contextObj.set(this.valueAttr, this.rangeInputNode.value);
            });
        },

        // Rerender the interface.
        _updateRendering: function () {
            this.rangeInputNode.disabled = this.readOnly;

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");

                if (this.stepAttr && this.stepAttr !== "") {
                    dojoProp.set(this.rangeInputNode, {
                        step: this._contextObj.get(this.stepAttr)
                    });
                }

                var valu = this._contextObj.get(this.valueAttr),
                    min = this._contextObj.get(this.minAttr),
                    max = this._contextObj.get(this.maxAttr);

                if (!this.$rangeInputNode) {
                    this.$rangeInputNode = $(this.rangeInputNode);
                }
                this.$rangeInputNode.rangeslider(this._options);

                if (!this._initialized) {
                    // add some blank text to the fill and handle
                    // needed when using label styling
                    var fill = dojoQuery(".rangeslider__fill", this.rangeSliderNode);
                    if (fill.length > 0) {
                        dojoHtml.set(fill[0], "&nbsp;");
                    }
                    var handle = dojoQuery(".rangeslider__handle", this.rangeSliderNode);
                    if (handle.length > 0) {
                        dojoHtml.set(handle[0], "&nbsp;");
                    }
                }

                var _this = this;
                return setTimeout(function () {
                    dojoProp.set(_this.rangeInputNode, {
                        min: min,
                        max: max
                    });

                    _this.$rangeInputNode.val(valu).change();

                    _this.$rangeInputNode.rangeslider("update", true);
                }, 10);
            } else {
                dojoStyle.set(this.domNode, "display", "none");

                if (this.$rangeInputNode) {
                    this.$rangeInputNode.rangeslider("destroy");

                    this.$rangeInputNode = null;
                }
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        _onSlideEnd: function (position, value) {
            this._contextObj.set(this.valueAttr, this.rangeInputNode.value);

            if (this.onSlideEndMF) {
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: this.onSlideEndMF,
                        guids: [this._contextObj.getGuid()]
                    },
                    callback: function (obj) {
                        //TODO what to do when all is ok!
                    },
                    error: dojoLang.hitch(this, function (error) {
                        console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

        // Handle validations.
        _handleValidation: function (validations) {
            //console.log(this.id + "._handleValidation");

            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.valueAttr);

            if (this.readOnly) {
                validation.removeAttribute(this.valueAttr);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.valueAttr);
            }
        },

        // Clear validations.
        _clearValidations: function () {
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            // Release handles on previous object, if any.
            if (this._handles) {
                this._handles.forEach(function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this._subscribeAttr(this.valueAttr);
                var minAttrHandle = this._subscribeAttr(this.minAttr);
                var maxAttrHandle = this._subscribeAttr(this.maxAttr);
                var stepAttrHandle = this._subscribeAttr(this.stepAttr);

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [objectHandle, attrHandle, minAttrHandle, maxAttrHandle, stepAttrHandle, validationHandle];
            }
        },

        _subscribeAttr: function (entityAttr) {
            return this.subscribe({
                guid: this._contextObj.getGuid(),
                attr: entityAttr,
                callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                    this._updateRendering();
                })
            });
        }
    });
});

require(["RangeSlider/widget/RangeSlider"], function () {
    "use strict";
});