local function isUsernameTaken(username, excludeCitizenId)
    local count

    if excludeCitizenId and excludeCitizenId ~= '' then
        count = MySQL.scalar.await(
            'SELECT COUNT(*) FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.twitterUsername")) = ? AND citizenid != ?',
            { username, excludeCitizenId }
        ) or 0
    else
        count = MySQL.scalar.await(
            'SELECT COUNT(*) FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.twitterUsername")) = ?',
            { username }
        ) or 0
    end

    return count > 0
end

local function generateTwitterUsername(Player)
    local charinfo = Player.PlayerData.charinfo or {}
    local base = (charinfo.firstname or 'user'):lower():gsub('%s+', ''):gsub('[^%w_]', '')
    if base == '' then
        base = 'user'
    end

    local candidate
    repeat
        candidate = ('%s%d'):format(base, math.random(100, 9999))
    until not isUsernameTaken(candidate)

    return candidate
end

local function ensureTwitterUsername(Player)
    local metadata = Player.PlayerData.metadata or {}
    local username = metadata.twitterUsername

    local citizenid = Player.PlayerData.citizenid

    if username and username ~= '' and not isUsernameTaken(username, citizenid) then
        return username
    end

    local generated = generateTwitterUsername(Player)
    Player.Functions.SetMetaData('twitterUsername', generated)
    return generated
end

local function getTweetById(tweetId)
    return MySQL.single.await('SELECT id, citizenid, username, message, likes, timestamp FROM phone_twitter WHERE id = ?', { tweetId })
end

lib.callback.register('qbx_phone:getTwitterProfile', function(source)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return { username = 'unknown' }
    end

    local username = ensureTwitterUsername(Player)
    return { username = username }
end)

lib.callback.register('qbx_phone:setTwitterUsername', function(source, newUsername)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return { success = false, error = 'player_not_found' }
    end

    local username = tostring(newUsername or ''):lower():gsub('%s+', ''):gsub('[^%w_]', '')
    if username == '' then
        return { success = false, error = 'invalid_username' }
    end

    if #username < 3 or #username > 20 then
        return { success = false, error = 'invalid_length' }
    end

    local citizenid = Player.PlayerData.citizenid
    if isUsernameTaken(username, citizenid) then
        return { success = false, error = 'username_taken' }
    end

    Player.Functions.SetMetaData('twitterUsername', username)
    return { success = true, username = username }
end)

lib.callback.register('qbx_phone:getTweets', function(source, page)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {}
    end

    ensureTwitterUsername(Player)

    local pageNumber = math.max(tonumber(page) or 0, 0)
    local limit = 50
    local offset = pageNumber * limit

    local tweets = MySQL.query.await(
        'SELECT id, citizenid, username, message, likes, timestamp FROM phone_twitter ORDER BY id DESC LIMIT ? OFFSET ?',
        { limit, offset }
    ) or {}

    local myCitizenId = Player.PlayerData.citizenid
    for i = 1, #tweets do
        tweets[i].isOwn = tweets[i].citizenid == myCitizenId
    end

    return tweets
end)

lib.callback.register('qbx_phone:postTweet', function(source, data)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return { success = false, error = 'player_not_found' }
    end

    local message = (data and data.message or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if message == '' then
        return { success = false, error = 'empty' }
    end

    if #message > 280 then
        return { success = false, error = 'too_long' }
    end

    local username = ensureTwitterUsername(Player)
    local citizenid = Player.PlayerData.citizenid

    local tweetId = MySQL.insert.await(
        'INSERT INTO phone_twitter (citizenid, username, message, likes) VALUES (?, ?, ?, 0)',
        { citizenid, username, message }
    )

    local tweet = getTweetById(tweetId)

    TriggerClientEvent('qbx_phone:tweetsUpdated', -1)

    return {
        success = true,
        tweet = tweet
    }
end)

lib.callback.register('qbx_phone:likeTweet', function(source, tweetId)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return { success = false, error = 'player_not_found' }
    end

    local id = tonumber(tweetId)
    if not id then
        return { success = false, error = 'invalid_id' }
    end

    local updated = MySQL.update.await('UPDATE phone_twitter SET likes = likes + 1 WHERE id = ?', { id })
    if not updated or updated < 1 then
        return { success = false, error = 'not_found' }
    end

    TriggerClientEvent('qbx_phone:tweetsUpdated', -1)
    return { success = true }
end)

lib.callback.register('qbx_phone:deleteTweet', function(source, tweetId)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return { success = false, error = 'player_not_found' }
    end

    local id = tonumber(tweetId)
    if not id then
        return { success = false, error = 'invalid_id' }
    end

    local deleted = MySQL.update.await('DELETE FROM phone_twitter WHERE id = ? AND citizenid = ?', { id, Player.PlayerData.citizenid })
    if not deleted or deleted < 1 then
        return { success = false, error = 'not_owner_or_missing' }
    end

    TriggerClientEvent('qbx_phone:tweetsUpdated', -1)
    return { success = true }
end)
