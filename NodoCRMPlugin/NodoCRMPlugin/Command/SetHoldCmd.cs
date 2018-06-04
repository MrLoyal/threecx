using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NodoCRMPlugin.Command
{
    class SetHoldCmd : BaseCmd
    {
        public String CallID { get; set; }

        public Boolean HoldOn { get; set; }
    }
}
