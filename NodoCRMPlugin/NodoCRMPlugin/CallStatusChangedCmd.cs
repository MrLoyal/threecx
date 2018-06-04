using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NodoCRMPlugin
{
    class CallStatusChangedCmd : BaseCmd
    {
        public String State { set; get; }
        public String CallID { set; get; }
        public String CallerNumber { set; get; }
    }
}
