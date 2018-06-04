# -*- coding: utf-8 -*-
from odoo import http
import logging
import json
_logger = logging.getLogger(__name__)


class ThreeCxController(http.Controller):
    @http.route('/threecx/getpartner/', auth='public', type='json')
    def index(self, **kw):
        params = http.request.params
        phone_number = params.get('phone_number', "-1")
        env = http.request.env

        res = dict()
        partner = env['res.partner'].search(['|', ('phone', '=', phone_number), ('mobile', '=', phone_number)], limit=1)
        if partner:
            res['name'] = partner.name
            res['id'] = partner.id
        else:
            res['name'] = False
            res['id'] = -1
        return json.dumps(res)
