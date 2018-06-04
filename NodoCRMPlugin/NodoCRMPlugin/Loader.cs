using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
using WebSocketSharp.Server;
using MyPhonePlugins;

namespace NodoCRMPlugin
{
    [MyPhonePlugins.CRMPluginLoader]
    public class NodoCRMPluginLoader
    {
        private static NodoCRMPluginLoader instance = null;
        private MyPhonePlugins.IMyPhoneCallHandler handler = null;
        private CallStatus _currentCallStatus { get; set; }
        private MyPhoneStatus _currentPhoneStatus { get; set; }
        private VoIP _voip;
        

        [MyPhonePlugins.CRMPluginInitializer]
        public static void Loader(MyPhonePlugins.IMyPhoneCallHandler handler)
        {
            instance = new NodoCRMPluginLoader(handler);
        }

        private NodoCRMPluginLoader(MyPhonePlugins.IMyPhoneCallHandler handler)
        {
            this.handler = handler;
            handler.OnCallStatusChanged += new CallInfoHandler(CallHandlerOnCallStatusChanged);
            handler.OnMyPhoneStatusChanged += new MyPhoneStatusHandler(CallHandlerOnMyPhoneStatusChanged);

            var wsServer = new WebSocketServer(6789);
            // this._voip = new VoIP(handler, this._currentCallStatus, this._currentPhoneStatus);
            wsServer.AddWebSocketService("/voip", () => {
                var voip = new VoIP(handler, _currentCallStatus, this._currentPhoneStatus);
                return voip;
            });
            wsServer.Start();
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Loader finished it job");
        }

        private void CallHandlerOnCallStatusChanged(object sender, CallStatus status)
        {
            this._currentCallStatus = status;
            ///this._voip._callStatus = status;
            Debug.WriteLine(">>>>>>>>>>>>>>>>>> Call status: " + status);
        }

        private void CallHandlerOnMyPhoneStatusChanged(object sender, MyPhoneStatus status)
        {
            this._currentPhoneStatus = status;
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>> Phone status: " + status);
            Debug.WriteLine(">>>>>>>>>>>>>>>>>>> This Phone status: " + status);
            //this._voip._phoneStatus = status;
        }


    }
}
