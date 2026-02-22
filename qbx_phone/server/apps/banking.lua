MySQL.query.await([[
    CREATE TABLE IF NOT EXISTS `qbx_phone_bank_transactions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `sender_citizenid` VARCHAR(50) NOT NULL,
        `receiver_citizenid` VARCHAR(50) NOT NULL,
        `amount` INT NOT NULL,
        `description` VARCHAR(255) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_qbx_phone_bank_sender` (`sender_citizenid`),
        INDEX `idx_qbx_phone_bank_receiver` (`receiver_citizenid`),
        INDEX `idx_qbx_phone_bank_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
]])

local function getPlayerByCitizenId(citizenid)
    local players = GetPlayers()
    for i = 1, #players do
        local playerSource = tonumber(players[i])
        local target = exports.qbx_core:GetPlayer(playerSource)
        if target and target.PlayerData and target.PlayerData.citizenid == citizenid then
            return target, playerSource
        end
    end

    return nil, nil
end

local function getBankBalanceByCitizenId(citizenid)
    local onlinePlayer = select(1, getPlayerByCitizenId(citizenid))
    if onlinePlayer then
        local money = onlinePlayer.PlayerData.money or {}
        return tonumber(money.bank) or 0
    end

    local bank = MySQL.scalar.await('SELECT JSON_UNQUOTE(JSON_EXTRACT(money, "$.bank")) FROM players WHERE citizenid = ?', { citizenid })
    return tonumber(bank) or 0
end

local function setOfflineBankBalance(citizenid, newBalance)
    MySQL.update.await('UPDATE players SET money = JSON_SET(COALESCE(money, JSON_OBJECT()), "$.bank", ?) WHERE citizenid = ?', {
        tonumber(newBalance) or 0,
        citizenid
    })
end

local function addTransaction(senderCitizenId, receiverCitizenId, amount, description)
    MySQL.insert.await(
        'INSERT INTO qbx_phone_bank_transactions (sender_citizenid, receiver_citizenid, amount, description) VALUES (?, ?, ?, ?)',
        { senderCitizenId, receiverCitizenId, amount, description }
    )
end

local function getTransactions(citizenid)
    local rows = MySQL.query.await([[
        SELECT
            id,
            sender_citizenid,
            receiver_citizenid,
            amount,
            description,
            created_at
        FROM qbx_phone_bank_transactions
        WHERE sender_citizenid = ? OR receiver_citizenid = ?
        ORDER BY created_at DESC
        LIMIT 20
    ]], { citizenid, citizenid })

    local formatted = {}
    for i = 1, #(rows or {}) do
        local row = rows[i]
        local incoming = row.receiver_citizenid == citizenid
        formatted[#formatted + 1] = {
            id = row.id,
            type = incoming and 'incoming' or 'outgoing',
            amount = tonumber(row.amount) or 0,
            description = row.description or '',
            timestamp = row.created_at,
            counterparty = incoming and row.sender_citizenid or row.receiver_citizenid
        }
    end

    return formatted
end

local function resolveReceiverCitizenId(identifier)
    if not identifier or identifier == '' then
        return nil
    end

    local byCitizenId = MySQL.scalar.await('SELECT citizenid FROM players WHERE citizenid = ? LIMIT 1', { identifier })
    if byCitizenId then
        return byCitizenId
    end

    local byPhone = MySQL.scalar.await('SELECT citizenid FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.phoneNumber")) = ? LIMIT 1', { identifier })
    if byPhone then
        return byPhone
    end

    return nil
end

lib.callback.register('qbx_phone:getBankData', function(source)
    if not Config.BankingIntegration then
        return {
            enabled = false,
            balance = 0,
            transactions = {}
        }
    end

    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {
            enabled = true,
            balance = 0,
            transactions = {}
        }
    end

    local citizenid = Player.PlayerData.citizenid
    local balance = getBankBalanceByCitizenId(citizenid)
    local transactions = getTransactions(citizenid)

    return {
        enabled = true,
        balance = balance,
        transactions = transactions
    }
end)

lib.callback.register('qbx_phone:bankTransfer', function(source, data)
    if not Config.BankingIntegration then
        return {
            success = false,
            error = 'banking_disabled'
        }
    end

    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {
            success = false,
            error = 'player_not_found'
        }
    end

    local senderCitizenId = Player.PlayerData.citizenid
    local receiverIdentifier = data and data.target
    local amount = math.floor(tonumber(data and data.amount) or 0)
    local description = (data and data.description) or ''

    if not receiverIdentifier or receiverIdentifier == '' or amount <= 0 then
        return {
            success = false,
            error = 'invalid_data'
        }
    end

    local receiverCitizenId = resolveReceiverCitizenId(receiverIdentifier)
    if not receiverCitizenId then
        return {
            success = false,
            error = 'receiver_not_found'
        }
    end

    if receiverCitizenId == senderCitizenId then
        return {
            success = false,
            error = 'invalid_target'
        }
    end

    local senderBalance = getBankBalanceByCitizenId(senderCitizenId)
    if senderBalance < amount then
        return {
            success = false,
            error = 'insufficient_funds'
        }
    end

    local senderMoneyRemoved = false
    if Player.Functions and Player.Functions.RemoveMoney then
        senderMoneyRemoved = Player.Functions.RemoveMoney('bank', amount, ('phone-transfer:%s'):format(receiverCitizenId))
    end

    if not senderMoneyRemoved then
        setOfflineBankBalance(senderCitizenId, senderBalance - amount)
    end

    local receiverPlayer = select(1, getPlayerByCitizenId(receiverCitizenId))
    if receiverPlayer and receiverPlayer.Functions and receiverPlayer.Functions.AddMoney then
        receiverPlayer.Functions.AddMoney('bank', amount, ('phone-transfer-from:%s'):format(senderCitizenId))
    else
        local receiverBalance = getBankBalanceByCitizenId(receiverCitizenId)
        setOfflineBankBalance(receiverCitizenId, receiverBalance + amount)
    end

    addTransaction(senderCitizenId, receiverCitizenId, amount, description)

    local updated = {
        success = true,
        balance = getBankBalanceByCitizenId(senderCitizenId),
        transactions = getTransactions(senderCitizenId)
    }

    return updated
end)
