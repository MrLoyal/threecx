odoo.define('threecx.ThreeCXPhoneTrayIcon', function (require) {
    "use strict";

    var core = require('web.core');
    var _t = core._t;

    var SystrayMenu = require('web.SystrayMenu');
    var Widget = require('web.Widget');
    var WebClient = require('web.WebClient');
    var FieldPhone = require('web.basic_fields').FieldPhone;
    var QWeb = core.qweb;

    var cssHide = "-480px";
    var cssMinimize = "-450px"
    var phoneTrayWidgetName = "threecx.PhoneTrayMenu";

    var unknownCaller = _t("Unknown caller");

    var STATE_INIT = "init";
    var STATE_CONNECTED = "connected";
    var STATE_CLOSED = "closed";

    var ThreeCXPhoneTrayIcon = Widget.extend({
        template: 'threecx.PhoneTrayMenu',
        events: {
            "click .the_phone_icon": function (e) {
                e.preventDefault();
                this.toggleMainView();
            },
        },
        init: function (parent, options) {
            this._super(parent, options);
            this.parent = parent;
            this.name = phoneTrayWidgetName;
        },

        toggleMainView: function () {
            // Event will be sent up through SystrayMenu and sent to WebClient and will be handled there
            this.trigger_up('tcx_phone_icon_clicked', {a: "ahihi"});
        },

        hideErrorAnimation: function () {
            // console.log("Hiding tray icon");
            this.$(".tcx_tray_warn_icon").css("display", "none");
        },
        playErrorAnimation: function () {
            this.$(".tcx_tray_warn_icon").css("display", "inline-block");
        }
    });

    SystrayMenu.Items.push(ThreeCXPhoneTrayIcon);

    // SystrayMenu.include({
    //     custom_events: _.extend({}, SystrayMenu.prototype.custom_events, {
    //         tcx_phone_icon_clicked: '_tcx_phone_icon_clicked',
    //     }),
    //
    //     _tcx_phone_icon_clicked: function (ev) {
    //         console.log("_tcx_phone_icon_clicked: e = ", ev);
    //     }
    // });


    ////////////////////////////////////////
    var ThreeCxMainView = Widget.extend({
        template: 'threecx.MainView',
        events: {
            "click .tcx_dial_window_close": function (e) {
                e.preventDefault();
                this.hide();
            },
            "click .tcx_dial_window_minimize": function (e) {
                e.preventDefault();
                if(this.$el.css("bottom") == "-450px"){
                    this.maximize();
                } else {
                    this.minimize();
                }
            },
            "click .tcx_button_answer": function (e) {
                console.log("Answer clicked.")
                e.preventDefault();
                this.answerCall(e);
            },
            "click .tcx_button_view_partner_info": function (e) {
                e.preventDefault();
                this.viewPartnerInfo(e);
            },
            "click .tcx_mute_button": function (e) {
                e.preventDefault();
                this.toggleMute();
            },
            "click .tcx_hold_button": function (e) {
                e.preventDefault();
                this.toggleHold();
            },
            "click .tcx_button_end_call": function (e) {
                e.preventDefault();
                this.sendEndCall();
            },
            "click .tcx_num_cell": function (e) {
                // console.log("Cell clicked: ", e.currentTarget.innerHTML);
                this.numPadCellClicked(e.currentTarget.innerHTML);
            },
            "click .tcx_backspace": function (e) {
                this.dialPadBackspace();
            },
            "click .tcx_make_call_button": function (e) {
                e.preventDefault();
                this.dialPadCallButtonClicked(e);
            }
        },
        init: function (parent) {
            this._super(parent);
            this.state = 'init';
            this.callState = undefined;
            this.phoneState = undefined;
            this.partnerName = undefined;
            this.partnerId = undefined;
            this.partnerImageUrl = undefined;
            this.callId = undefined;
            this.customerWindowAct = undefined;
            this.callStart = undefined;
            this.timerId = undefined;
            this.muted = false;
            this.holdOn = false;
        },
        start: function () {
            this.$(".screen.in_call").css("display", "none");
            this.loadCustomerWindowAction();
        },
        loadCustomerWindowAction: function () {
            var self = this;
            this._rpc({
                route: '/web/action/load',
                params: {
                    action_id: 'base.action_partner_form',
                },
            })
            .then(function(r) {
                // Keep 'form' view only because we only want to show detail info of the partner
                var views = r.views;
                var formView = undefined;
                views.forEach(function (el) {
                   if(el[1] == "form"){
                       formView = el;
                   }
                });
                if (formView){
                    r.views = [formView];
                }
                self.customerWindowAct = r;
            });

            this._rpc({
                route: '/web/action/load',
                params: {
                    action_id: 'threecx.call_log_act',
                },
            })
            .then(function(r) {
                console.log("Call log window action: ", r);
                r.target = "new";
                r.views = [[false, "form"]];
                r.res_id = 1;
                self.do_action(r);
            });
        },
        show: function () {
            // this.$el.css("bottom", "0px");
            this.maximize();
        },
        hide: function () {
            this.$el.css("bottom", cssHide);
        },
        minimize: function () {
            this.$el.css("bottom", cssMinimize);
            $(".tcx_dial_window_minimize").removeClass("fa-chevron-down");
            $(".tcx_dial_window_minimize").addClass("fa-chevron-up");
        },
        maximize: function () {
            this.$el.css("bottom", "0px");
            $(".tcx_dial_window_minimize").addClass("fa-chevron-down");
            $(".tcx_dial_window_minimize").removeClass("fa-chevron-up");
        },
        toggleVisibility: function () {
            // console.log("CSS bottom value: ", this.$el.css("bottom"));
            if (this.$el.css("bottom") == "0px"){
                this.hide();
            } else {
                this.show();
            }
        },
        toggleMute: function () {
            this.muted = !this.muted;
            var cmd = {
                Action: "mute_unmute",
                CallID: this.callId
            };
            this.send(cmd);
            if(this.muted == false){
                this.$(".tcx_mute_button").removeClass("active");
            } else {
                this.$(".tcx_mute_button").addClass("active");
            }
        },
        toggleHold: function () {
            var self = this;
            this.holdOn = !this.holdOn;
            if(this.holdOn){
                this.$(".tcx_hold_button").addClass("active");
            } else {
                this.$(".tcx_hold_button").removeClass("active");
            }
            var cmd = {
                Action: "set_hold",
                CallID: self.callId,
                HoldOn: self.holdOn
            };

            this.send(cmd);
        },
        connectTo3CxWindowClient: function () {
            var self = this;
            this.ws = new WebSocket("ws://localhost:6789/voip");
            this.ws.onopen = function (ev) {
                self.state = STATE_CONNECTED;
                self.hideCouldNotConnect();
                self.getCurrentState();
                self.trigger_up('tcx_connected_to_web_socket', {});
            };
            this.ws.onclose = function (ev) {
                // console.log("WS closed");

                // Used to be connected but now connection lost
                if(self.state == STATE_CONNECTED){
                    self.handleConnectionLost();
                }

                this.state == STATE_CLOSED;
            };
            this.ws.onmessage = function (ev) {
                //console.log("WS message: ", ev.data);
                self.handle3CxMessage(ev);
            };
            this.ws.onerror = function (event) {
                console.log("Error: ", event);
                // Could not open WebSocket
                if (!self.state || self.state == STATE_INIT){
                    console.log("Should handle could not connect, ev phase = ", event.eventPhase);
                    self.showCouldNotConnect();
                    self.trigger_up("tcx_could_not_connect_web_socket", {});
                } else {
                    console.log("Self stat = ", self.state);
                }
            }
        },

        handleConnectionLost: function () {
            this.$(".tcx_connection_lost_screen").css("display", "block");
            this.$(".tcx_disconnected_screen").css("display", "none");
            this.$(".in_call").css("display", "none");
            this.trigger_up("tcx_connection_lost", {});
        },

        /* Ask WebSocket server (3CX Windows Phone Client) about its current state
        *  Response will be passed to ws.onmessage */
        getCurrentState: function () {
            var self = this;
            var request = {
                Action: "get_current_state",
            };
            var data = self.packMessage(request);
            console.log("Data to send: ", data);
            this.ws.send(data);
        },
        displayCallerNumber: function(number){
            $(".tcx_caller_number").html(number);
        },
        handle3CxMessage: function (wsEv) {
            var self = this;
            var data = wsEv.data;
            var reader = new FileReader();
            reader.onload = function() {
                // console.log("Reader result: " + reader.result);
                self.handle3CxAction(reader.result);
            }
            reader.readAsText(data);
        },
        handle3CxAction: function (cmdStr) {
            var cmd = JSON.parse(cmdStr);
            switch (cmd.Action) {
                case "call_status_changed":
                    if (cmd.State == "Ringing"){
                        this.handleRinging(cmd);
                    } else if (cmd.State == "Connected") {
                        this.handleConnected(cmd);
                    } else if (cmd.State == "Ended"){
                        this.handleEnded(cmd);
                    } else if (cmd.State == "Dialing"){
                        this.handleDialing(cmd);
                    }
                    console.log("CMD: ", cmd);
                    break;
                case "response_current_state":
                    this.handleResponseCurrentState(cmd);
                    break;
            }
        },
        handleDialing: function (cmd) {
            var self = this;
            var otherPartyNumber = cmd.CallerNumber;
            this.callId = cmd.CallID;
            this.callState = "Dialing";
            this.muted = false;
            this.holdOn = false;
            this.displayCallerNumber(otherPartyNumber);
            this.showCallScreen();
            this.$(".tcx_button_answer").css("display", "none");
            this.$(".tcx_button_decline").css("display", "none");

            this.showRingingAnimation();
            this.$(".tcx_button_end_call").css("display", "block");

            this.$(".tcx_call_direction").html(_t("Outgoing call"));
            if(this.$el.css("bottom") == cssHide || this.$el.css("bottom") == cssMinimize){
                this.show();
            }
            self.getOtherPartyInfo(otherPartyNumber);
        },
        handleRinging: function (cmd) {
            var self = this;
            var callerNumber = cmd.CallerNumber;
            this.callId = cmd.CallID;
            this.callState = "Ringing";
            this.muted = false;
            this.holdOn = false;
            this.displayCallerNumber(callerNumber);
            this.showCallScreen();
            this.showRingingAnimation();
            this.$(".tcx_call_direction").html(_t("Incoming call"));
            if(this.$el.css("bottom") == cssHide || this.$el.css("bottom") == cssMinimize){
                this.show();
            }
            this.hideDialPad();
            self.getOtherPartyInfo(callerNumber);
        },

        // Get partner info and display it on phone screen
        getOtherPartyInfo: function (phoneNumber) {
            var self = this;
            this._rpc({
                route: '/threecx/getpartner/',
                params: {
                    phone_number: phoneNumber
                }
            })
            .then(function(r) {
                // r.res_id = self.eid;
                console.log("Get partner done: ", r);
                var res = JSON.parse(r);
                self.partnerName = res.name;

                if(parseInt(res.id) > 0){
                    var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
                    url += "/web/image?model=res.partner&field=image_medium&id="+ res.id;
                    self.partnerImageUrl = url;
                    self.partnerId = res.id;
                } else {
                    self.partnerImageUrl = undefined;
                    self.partnerId = undefined;
                    self.partnerName = undefined;
                }

                self.renderCallScreen();
            });
        },
        handleConnected: function (cmd) {
            console.log("Connected.");
            // From ringing to connected
            if(this.callState == "Ringing" || this.callState == "Dialing"){
                // Make it invisible only
                this.$(".tcx_button_answer").css("visibility", "hidden");
                this.$(".tcx_button_answer").css("display", "block");

                this.$(".tcx_button_decline").css("visibility", "hidden");
                this.$(".tcx_button_end_call").css("display", "block");

                this.$(".phonering-alo-ph-circle").css("display", "none");
                this.$(".phonering-alo-ph-circle-fill").css("display", "none");

                self.$(".tcx_mute_hold").css("display", "block");

                if(!this.partnerId || this.partnerId < 0){
                    this.$(".phonering-alo-ph-img-circle").css("animation", "none");
                }

                // Start timer
                this.callStart = Date.now();
                this.startTimer();
            }
            this.callState = "Connected";
        },
        handleEnded: function (cmd) {
            var self = this;

            // 3CX can handle a few calls at the same time.
            // We should handle the one which is displaying in Odoo only
            if (cmd.CallID == self.callId) {
                if (self.callState == "Ringing") {
                    // Show missed call screen
                }

                else if (self.callState == "Connected") {
                    self.stopTimer();
                    self.$(".tcx_button_end_call").css("display", "none");
                    self.$(".dial_pad").css("display", "none");
                }

                self.$(".tcx_mute_hold").css("display", "none");
                this.callState = "Ended";
            }
        },
        handleResponseCurrentState: function (cmd) {
            console.log("Current state: ", cmd);
            this.phoneState = cmd.PhoneState;
            if(cmd.CallState){
                this.callState = cmd.CallState;
            }
        },
        showCallScreen: function () {
            this.$(".screen.in_call").css("display", "block");
        },
        showCouldNotConnect: function () {
            this.$(".tcx_disconnected_screen").css("display", "block");
            this.$(".in_call").css("display", "none");
            this.$(".dial_pad").css("display", "none");
        },
        hideCouldNotConnect: function () {
            this.$(".tcx_disconnected_screen").css("display", "none");
        },
        showRingingAnimation: function () {
            var self = this;
            this.$(".tcx_button_answer").css("visibility", "visible");
            this.$(".tcx_button_decline").css("visibility", "visible");
            this.$(".tcx_button_end_call").css("display", "none");

            this.$(".phonering-alo-ph-circle").css("display", "block");
            this.$(".phonering-alo-ph-circle-fill").css("display", "block");
            self.$(".tcx_call_duration").css("visibility", "hidden");
            self.$(".tcx_mute_hold").css("display", "none");

            this.$(".phonering-alo-ph-img-circle").css("animation", "phonering-alo-circle-img-anim 1s infinite ease-in-out");
        },
        renderCallScreen: function () {
            if(this.partnerName){
                this.$(".tcx_partner_name").html(this.partnerName);
            } else {
                this.$(".tcx_partner_name").html(unknownCaller);
            }

            if(this.partnerImageUrl){
                this.$(".tcx_avatar").attr("src", this.partnerImageUrl);
                this.$(".tcx_avatar").css("visibility", "visible");
            } else {
                this.$(".tcx_avatar").css("visibility", "hidden");
            }

            if(!this.partnerId || this.partnerId < 0){
                this.$(".tcx_button_view_partner_info").css("display", "none");
            } else {
                this.$(".tcx_button_view_partner_info").css("display", "block");
            }
        },
        answerCall: function(clickEvent){
            // TODO: Handle has class disabled
            this.$(".tcx_button_answer").addClass("disabled");
            var cmd = {
                Action: "answer_call",
                CallID: this.callId
            };
            this.send(cmd);
        },
        makeCall: function (number) {
            // console.log("Making call to: ", number);
            // TODO: handle if there is a call already in progress
            this.hideDialPad();
            var cmd = {
                Action: "make_call",
                Destination: number
            };
            this.send(cmd);
        },
        viewPartnerInfo: function (e) {
            var self = this;
            if(this.customerWindowAct && this.partnerId){
                self.customerWindowAct.res_id = this.partnerId;
                self.do_action(self.customerWindowAct);
            } else {
                console.log("Something went wrong");
                console.log("customerWindowAct = ", this.customerWindowAct);
                console.log("partnerId = ", this.partnerId);
            }
        },
        startTimer: function () {
            var self = this;
            var timerId = setInterval(function () {
                var duration = Date.now() - self.callStart;
                duration = duration / 1000;
                var hours = Math.floor(duration / 3600);
                var mins = Math.floor((duration - (hours*3600)) / 60);
                var secs = Math.floor((duration - (hours*3600) - (mins*60)));
                var hoursStr = hours < 10 ? "0"+hours : hours+"";
                var minsStr = mins < 10 ? "0"+mins : mins+"";
                var secStr = secs < 10 ? "0"+secs : "" + secs;
                self.$(".tcx_call_duration").html(hoursStr + ":" + minsStr + ":" + secStr);
                self.$(".tcx_call_duration").css("visibility", "visible");
            }, 1000);
            self.timerId = timerId;
        },
        stopTimer: function () {
            if(this.timerId){
                clearInterval(this.timerId);
            }
        },

        /* Dial pad*/
        hideDialPad: function () {
            this.$(".dial_pad").css("display", "none");
        },
        numPadCellClicked: function (value) {
            this.dialPadAppend(value);
        },
        dialPadAppend: function(value){
            var input = this.$(".tcx_now_number");
            var newValue = input.val();
            newValue += value;
            input.val(newValue);
        },
        dialPadBackspace: function () {
            var input = this.$(".tcx_now_number");
            var newValue = input.val();
            newValue = newValue.substr(0, newValue.length - 1);
            input.val(newValue);
        },
        dialPadCallButtonClicked: function (e) {
            // console.log("Call clicked ", e);
            var destination = this.$(".tcx_now_number").val();
            this.makeCall(destination);
        },

        sendEndCall: function () {
            this.$(".tcx_button_end_call").addClass("disabled");
            var cmd = {
                Action: "end_call",
                CallID: this.callId
            };
            this.send(cmd);
        },
        packMessage: function (obj) {
            var json = JSON.stringify(obj);
            var length = json.length;
            var buffer = new ArrayBuffer(length);
            var array = new Uint8Array(buffer);
            for(var i = 0; i < length; i++) {
                array[i] = json.charCodeAt(i);
            }
            return array;
        },
        send: function (obj) {
            var self = this;
            this.ws.send(self.packMessage(obj));
        }
    });


    ///////////////////////////////////////////////////////////////////
    WebClient.include({
        custom_events: _.extend({}, WebClient.prototype.custom_events, {
            tcx_phone_icon_clicked: '_tcx_phone_icon_clicked',
            tcx_connected_to_web_socket: '_tcx_connected_to_web_socket',
            tcx_could_not_connect_web_socket: '_tcx_could_not_connect_web_socket',
            tcx_connection_lost: '_tcx_connection_lost',
            tcx_partner_phone_widget_clicked: '_tcx_partner_phone_widget_clicked'
        }),

        _tcx_partner_phone_widget_clicked: function (ev) {
            // console.log("Click handled in WebClient, ", ev);
            console.log("WebClient: ", this);
            var myPhone = this.threecxMainView;
            var data = ev.data;
            myPhone.makeCall(data.number);
        },

        _tcx_connected_to_web_socket: function (ev) {
            // console.log("WebClient: ", this);
            this.systray_menu.widgets.forEach(function (widget) {
                if (widget.name == phoneTrayWidgetName){
                    widget.hideErrorAnimation();
                }
            });
        },

        _tcx_phone_icon_clicked: function (ev) {
            // console.log("WebClient: _tcx_phone_icon_clicked: e = ", ev);
            this.threecxMainView.toggleVisibility();
        },

        _tcx_connection_lost: function (ev) {
            this.systray_menu.widgets.forEach(function (widget) {
                if (widget.name == phoneTrayWidgetName){
                    widget.playErrorAnimation();
                }
            });
        },

        _tcx_could_not_connect_web_socket: function () {
            this.systray_menu.widgets.forEach(function (widget) {
                if (widget.name == phoneTrayWidgetName){
                    widget.playErrorAnimation();
                }
            });
        },

        show_application: function() {
            var self = this;
            var threecxMainView = new ThreeCxMainView(self);
            threecxMainView.appendTo(self.$el);
            this.threecxMainView = threecxMainView;
            threecxMainView.connectTo3CxWindowClient();
            return this._super.apply(this, arguments);
        }
    });

    FieldPhone.include({
        events: _.extend({}, FieldPhone.prototype.events, {
            "click .tcx_widget_phone_icon": function (e) {
                e.stopPropagation();
                this.trigger_up('tcx_partner_phone_widget_clicked', {number: this.value});
            }
        }),
        _renderReadonly: function () {
            this._super.apply(this, arguments);
            var phone = $('<span class="tcx_widget_phone_icon" title="Call to this number"> <i aria-hidden="true" class="fa fa-phone fa-fw"></i> </span>');
            this.$el.append(phone);
        }
    });



    return ThreeCXPhoneTrayIcon;
});