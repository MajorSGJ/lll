RegisterNUICallback('getBankData', function(_, cb)
    local result = lib.callback.await('qbx_phone:getBankData')
    cb(result or {
        enabled = false,
        balance = 0,
        transactions = {}
    })
end)

RegisterNUICallback('bankTransfer', function(data, cb)
    local result = lib.callback.await('qbx_phone:bankTransfer', false, {
        target = data.target,
        amount = data.amount,
        description = data.description
    })

    cb(result or {
        success = false,
        error = 'unknown_error'
    })
end)

RegisterNUICallback('bankDeposit', function(_, cb)
    cb({
        success = false,
        error = 'atm_only'
    })
end)

RegisterNUICallback('bankWithdraw', function(_, cb)
    cb({
        success = false,
        error = 'atm_only'
    })
end)

RegisterNetEvent('qbx_phone:bankDataUpdated', function(payload)
    SendNUIMessage({
        type = 'bankDataUpdated',
        payload = payload or {}
    })
end)
