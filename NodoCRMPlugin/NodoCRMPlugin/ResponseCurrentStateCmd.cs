using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NodoCRMPlugin
{
    class ResponseCurrentStateCmd : BaseCmd
    {
        public String CallState { set; get; }
        public String PhoneState { set; get; }

        public ResponseCurrentStateCmd()
        {
            this.Action = "response_current_state";
        }
    }
}
