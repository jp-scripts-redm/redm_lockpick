local pass

-- difficulty: "easy", "normal", "hard" or a custom table
-- e.g. lockpick("easy") or lockpick({ solvePadding = 15, pinDamage = 5, numPins = 5 })
function lockpick(difficulty)
    Wait(100)
    openui(difficulty)

    while pass == nil do
        Citizen.Wait(1)
    end

    if pass == true then
        closeui()
        pass = nil
        return true
    elseif pass == false then
        closeui()
        pass = nil
        return false
    end
end

local difficultyPresets = {
    easy   = { solvePadding = 15, pinDamage = 5,  numPins = 5, maxDistFromSolve = 50, pinDamageInterval = 300 },
    normal = { solvePadding = 10, pinDamage = 10, numPins = 3, maxDistFromSolve = 45, pinDamageInterval = 200 },
    hard   = { solvePadding = 5,  pinDamage = 20, numPins = 2, maxDistFromSolve = 40, pinDamageInterval = 150 },
}

function openui(difficulty)
    SetNuiFocus(true, true)

    local diffSettings = nil
    if type(difficulty) == "string" and difficultyPresets[difficulty] then
        diffSettings = difficultyPresets[difficulty]
    elseif type(difficulty) == "table" then
        diffSettings = difficulty
    end

    SendNUIMessage({
        action = "ui",
        toggle = true,
        difficulty = diffSettings
    })
end

function closeui()
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = "ui",
        toggle = false
    })
end

RegisterNUICallback('callback', function(data)
    pass = data.success
end)
