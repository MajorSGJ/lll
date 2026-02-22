fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'qbx_phone'
author 'QBX Team'
version '1.0.0'
description 'QBX Phone resource'

dependencies {
    'qbx_core',
    'oxmysql',
    'ox_lib'
}

shared_scripts {
    'config.lua'
}

client_scripts {
    'client/main.lua',
    'client/contacts.lua',
    'client/messages.lua',
    'client/calls.lua',
    'client/apps/banking.lua',
    'client/apps/twitter.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua',
    'server/contacts.lua',
    'server/messages.lua',
    'server/calls.lua',
    'server/notifications.lua',
    'server/apps/banking.lua',
    'server/apps/twitter.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/style.css',
    'html/js/app.js',
    'html/js/contacts.js',
    'html/js/messages.js',
    'html/js/calls.js',
    'html/js/apps/banking.js',
    'html/js/apps/twitter.js',
    'html/js/apps/settings.js',
    'html/sounds/notification.ogg'
}