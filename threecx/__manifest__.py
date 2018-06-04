# -*- coding: utf-8 -*-
{
    'name': "3CX Odoo integration",

    'summary': """
        Connect Odoo client and 3CX""",

    'description': """
        Long description of module's purpose
    """,

    'author': "Thanh Loyal",
    'website': "https://www.facebook.com/ThanhLoyal89",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base', 'crm'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
        'views/call_log.xml',
        'views/threecx_views.xml',

    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        'static/src/xml/threecx_systray.xml',
    ]
}
