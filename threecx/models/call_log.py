# -*- coding: utf-8 -*-

from odoo import models, fields, api
import logging
_logger = logging.getLogger(__name__)


class ThreeCxCallLog(models.Model):
    _name = 'tcx.call.log'
    _description = '3CX call log'

    name = fields.Char("Name")
    partner_id = fields.Many2one('res.partner', "Partner")
    other_party_name = fields.Char("Other party name", help="Name of person who called you or you called him/her. This may be the partner name")
    other_party_number = fields.Char("Other party number", required=True)
    duration = fields.Integer("Duration in seconds")
    duration_display = fields.Char("Call duration", compute='_compute_duration_display')
    call_date_time = fields.Datetime("Call time", required=True, default=fields.Datetime.now)
    note = fields.Html("Call summary")

    @api.depends('duration')
    def _compute_duration_display(self):
        for record in self:
            record.duration_display = "%s seconds" % record.duration

    @api.onchange('partner_id')
    def _onchange_partner_id(self):
        self.ensure_one()
        self.name = self.partner_id.name
