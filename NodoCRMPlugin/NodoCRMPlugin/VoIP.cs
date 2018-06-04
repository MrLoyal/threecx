using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebSocketSharp.Server;
using MyPhonePlugins;
using WebSocketSharp;
using System.Diagnostics;
using System.Web.Script.Serialization;
using NodoCRMPlugin.Command;


namespace NodoCRMPlugin
{
    class VoIP : WebSocketBehavior
    {
        private IMyPhoneCallHandler handler;
        private JavaScriptSerializer serializer;
        public CallStatus _callStatus { set; get; }
        public MyPhoneStatus _phoneStatus { set; get; }

        public VoIP()
            : this(null, null, MyPhoneStatus.NoConnection)
        { }

        public VoIP(IMyPhoneCallHandler handler, CallStatus callStatus, MyPhoneStatus phoneStatus)
        {
            this.handler = handler;
            this._callStatus = callStatus;
            this._phoneStatus = phoneStatus;

            serializer = new JavaScriptSerializer();

            handler.OnCallStatusChanged += new CallInfoHandler(CallHandlerOnCallStatusChanged);
            handler.OnMyPhoneStatusChanged += new MyPhoneStatusHandler(CallHandlerOnMyPhoneStatusChanged);
            //Debug.WriteLine(">>>>>>>>>>>>>>>>>>> VoIP handler created.");
            //Debug.WriteLine(">>>>>>>>>>>>>>>>>>> call status: " + callStatus);
            //Debug.WriteLine(">>>>>>>>>>>>>>>>>>> phone status: " + phoneStatus);
        }


        protected override void OnOpen()
        {
            base.OnOpen();
            //Debug.WriteLine(">>>>>>>>>>>>>>>>>>>> WebSocket opened. WebSocket Handler instance: " + this);
        }

        protected override void OnClose(CloseEventArgs e)
        {
            base.OnClose(e);
            //Debug.WriteLine(">>>>>>>>>>>>>>>>>>>> WebSocket closed. WebSocket Handler instance: " + this);
        }

        protected override void OnMessage(MessageEventArgs e)
        {
            var data = Encoding.UTF8.GetString(e.RawData);
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>>> OnMessage: " + data);
            var request = serializer.Deserialize<BaseCmd>(data);
            var requestAction = request.Action;
            switch (requestAction) {
                case "get_current_state":
                    this.ResponseCurrentState();
                    break;

                case "answer_call":
                    Debug.WriteLine("answer_call");
                    var answerCallCmd = serializer.Deserialize<AnswerCallCmd>(data);
                    this.AnswerCall(answerCallCmd);
                    break;

                case "mute_unmute":
                    var muteCmd = serializer.Deserialize<MuteUnmuteCmd>(data);
                    this.MuteOrUnmute(muteCmd);
                    break;

                case "end_call":
                    var endCallCmd = serializer.Deserialize<DropCallCmd>(data);
                    this.DropCall(endCallCmd);
                    break;

                case "set_hold":
                    var holdCmd = serializer.Deserialize<SetHoldCmd>(data);
                    this.HoldCall(holdCmd);
                    break;

                case "make_call":
                    var makeCallCmd = serializer.Deserialize<MakeCallCmd>(data);
                    this.MakeCall(makeCallCmd);
                    break;

                default:
                    Debug.WriteLine("Default: action = " + requestAction);
                    break;
            }
        }

        private void MakeCall(MakeCallCmd makeCallCmd)
        {
            this.handler.MakeCall(makeCallCmd.Destination);
        }

        private void HoldCall(SetHoldCmd holdCmd)
        {
            this.handler.Hold(holdCmd.CallID, holdCmd.HoldOn);
        }

        private void DropCall(DropCallCmd endCallCmd)
        {
            this.handler.DropCall(endCallCmd.CallID);
        }

        private void MuteOrUnmute(MuteUnmuteCmd muteCmd)
        {
            this.handler.Mute(muteCmd.CallID);
        }

        private void AnswerCall(AnswerCallCmd request)
        {
            this.handler.Activate(request.CallID);
        }

        private void ResponseCurrentState()
        {
            // Debug.WriteLine(">>>>>>>>>>>>>>>>>>>> ResponseCurrentState");
            // Debug.WriteLine(">>>>>>>>>>>>>>>>>>>> ResponseCurrentState: " + _phoneStatus);
            var state = new ResponseCurrentStateCmd
            {
                CallState = _callStatus == null ? null : _callStatus.State.ToString(),
                PhoneState = _phoneStatus.ToString()
            };
            this.SendCommand(state);
        }






        private void CallHandlerOnCallStatusChanged(object sender, CallStatus status)
        {
            this._callStatus = status;
            CallStatus ss = status;
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>>\nCall status changed: status: " + status);
            Debug.WriteLine("Call status changed: call ID: " + status.CallID);
            Debug.WriteLine("Call status changed: call state:" + status.State);

            var cmd = new CallStatusChangedCmd
            {
                Action = "call_status_changed"
            };

            var state = status.State.ToString();
            switch (state) {
                case "Ringing":
                    cmd.CallID = status.CallID.ToString();
                    cmd.CallerNumber = status.OtherPartyNumber;
                    break;

                case "Ended":
                    break;

                case "Dialing":
                    cmd.CallerNumber = status.OtherPartyNumber;
                    break;
            }
            cmd.CallID = status.CallID.ToString();
            cmd.State = state;
            this.SendCommand(cmd);
            
        }

        private void SendCommand(BaseCmd cmd)
        {
            if (this.State == WebSocketState.Open)
            {
                var data = Encoding.UTF8.GetBytes(serializer.Serialize(cmd));
                Send(data);
            }
        }

        private void CallHandlerOnMyPhoneStatusChanged(object sender, MyPhoneStatus status)
        {
            this._phoneStatus = status;
            
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>>>>>>>>>>> Phone status changed: " + status.ToString());

            var cmd = new BaseCmd();
            cmd.Action = "phone_status_changed";

            SendCommand(cmd);
        }

    }
}
