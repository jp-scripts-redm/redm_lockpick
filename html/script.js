var minRot = -90,
    maxRot = 90,
    solveDeg = (Math.random() * 180) - 90,
    solvePadding = 5,        // was 10 — shrinks the "perfect" zone significantly
    maxDistFromSolve = 25,   // was 45 — cylinder locks up much sooner when you're off
    pinRot = 0,
    cylRot = 0,
    lastMousePos = 0,
    mouseSmoothing = 2,
    keyRepeatRate = 25,
    cylRotSpeed = 3,
    pinDamage = 18,          // was 10 — pins break almost twice as fast
    pinDamageInterval = 100, // was 200 — damage ticks twice as often when forcing
    pinDamageInterval = 200,
    numPins = 3,
    totalPins = 2,
    pinsToSolve = 1,
    pinsSolved = 0,
    userPushingCyl = false,
    gameOver = false,
    gamePaused = false,
    pin, cyl, driver, cylRotationInterval, pinLastDamaged;


$(function () {
    pin = $('#pin');
    cyl = $('#cylinder');
    driver = $('#driver');

    $('#wrap').hide();

    // Create HUD overlay OUTSIDE #wrap so it doesn't affect lock positioning
    var hud = $('<div id="lockpickHud"></div>');
    hud.append('<div id="healthBar"><div id="healthFill"></div></div>');
    hud.append('<div id="pinCounter"></div>');
    $('body').append(hud);
    updatePinCounter();

    window.addEventListener('message', function(event){
        var eventData = event.data;
        if (eventData.action == "ui") {
            if (eventData.toggle) {
                // Apply difficulty settings if provided
                if (eventData.difficulty) {
                    var d = eventData.difficulty;
                    if (d.solvePadding !== undefined) solvePadding = d.solvePadding;
                    if (d.pinDamage !== undefined) pinDamage = d.pinDamage;
                    if (d.numPins !== undefined) { numPins = d.numPins; totalPins = d.numPins; }
                    if (d.maxDistFromSolve !== undefined) maxDistFromSolve = d.maxDistFromSolve;
                    if (d.pinDamageInterval !== undefined) pinDamageInterval = d.pinDamageInterval;
                }
                solveDeg = (Math.random() * 180) - 90;
                numPins = totalPins;
                fullReset();
                updatePinCounter();
                updateHealthBar();
                $('#wrap').fadeIn(250);
                $('#lockpickHud').fadeIn(250);
                gameOver = false;
                gamePaused = false;
            } else {
                $('#wrap').fadeOut(50);
                $('#lockpickHud').fadeOut(50);
                gameOver = false;
                gamePaused = false;
            }
        }
    });

    $('body').on('mousemove', function (e) {
        if (lastMousePos && !gameOver && !gamePaused) {
            var pinRotChange = (e.clientX - lastMousePos) / mouseSmoothing;
            pinRot += pinRotChange;
            pinRot = Util.clamp(pinRot, maxRot, minRot);
            pin.css({
                transform: "rotateZ(" + pinRot + "deg)"
            });
            updateProximityHint();
        }
        lastMousePos = e.clientX;
    });

    $('body').on('mouseleave', function (e) {
        lastMousePos = 0;
    });

    $('body').on('keydown', function (e) {
        if ((e.keyCode == 87 || e.keyCode == 65 || e.keyCode == 83 || e.keyCode == 68 || e.keyCode == 37 || e.keyCode == 39) && !userPushingCyl && !gameOver && !gamePaused) {
            pushCyl();
        }
    });

    $('body').on('keyup', function (e) {
        if ((e.keyCode == 87 || e.keyCode == 65 || e.keyCode == 83 || e.keyCode == 68 || e.keyCode == 37 || e.keyCode == 39) && !gameOver) {
            unpushCyl();
        }
    });

    document.onkeyup = function (data) {
        if (data.which == 27 && !gameOver) {
            // ESC pressed - close the minigame as a failure
            gameOver = true;
            gamePaused = true;
            clearInterval(cylRotationInterval);
            $.post('http://lockpick/callback', JSON.stringify({
                success: false
            }));
            $('#wrap').fadeOut(150);
            $('#lockpickHud').fadeOut(150);
            setTimeout(function(){
                fullReset();
                updateHealthBar();
                gameOver = false;
                gamePaused = false;
            }, 200);
        }
    };
});

// Proximity hint - subtle glow when near sweet spot
function updateProximityHint() {
    var dist = Math.abs(pinRot - solveDeg);
    var proximity = 1 - Util.clamp(dist / (maxDistFromSolve * 0.8), 1, 0);
    if (proximity > 0.3) {
        var alpha = (proximity - 0.3) * 0.4;
        $('#collar').css('filter', 'drop-shadow(0 0 ' + (proximity * 12) + 'px rgba(255, 200, 80, ' + alpha + '))');
    } else {
        $('#collar').css('filter', 'none');
    }
}

function updateHealthBar() {
    var pct = Math.max(0, pinHealth);
    $('#healthFill').css('width', pct + '%');
    if (pct > 50) {
        $('#healthFill').css('background', '#4a4');
    } else if (pct > 25) {
        $('#healthFill').css('background', '#ca3');
    } else {
        $('#healthFill').css('background', '#c44');
    }
}

function updatePinCounter() {
    var dots = '';
    for (var i = 0; i < totalPins; i++) {
        if (i < numPins) {
            dots += '<span class="pinDot active"></span>';
        } else {
            dots += '<span class="pinDot broken"></span>';
        }
    }
    $('#pinCounter').html(dots);
}

// CYL INTERACTIVITY
function pushCyl() {
    var distFromSolve, cylRotationAllowance;
    clearInterval(cylRotationInterval);
    userPushingCyl = true;

    distFromSolve = Math.abs(pinRot - solveDeg) - solvePadding;
    distFromSolve = Util.clamp(distFromSolve, maxDistFromSolve, 0);

    cylRotationAllowance = Util.convertRanges(distFromSolve, 0, maxDistFromSolve, 1, 0.02);
    cylRotationAllowance = cylRotationAllowance * maxRot;

    cylRotationInterval = setInterval(function () {
        cylRot += cylRotSpeed;
        if (cylRot >= maxRot) {
            cylRot = maxRot;
            clearInterval(cylRotationInterval);
            unlock();
        }
        else if (cylRot >= cylRotationAllowance) {
            cylRot = cylRotationAllowance;
            damagePin();
        }

        cyl.css({
            transform: "rotateZ(" + cylRot + "deg)"
        });
        driver.css({
            transform: "rotateZ(" + cylRot + "deg)"
        });
    }, keyRepeatRate);
}

function unpushCyl() {
    userPushingCyl = false;
    clearInterval(cylRotationInterval);
    cylRotationInterval = setInterval(function () {
        cylRot -= cylRotSpeed;
        cylRot = Math.max(cylRot, 0);
        cyl.css({
            transform: "rotateZ(" + cylRot + "deg)"
        });
        driver.css({
            transform: "rotateZ(" + cylRot + "deg)"
        });
        if (cylRot <= 0) {
            cylRot = 0;
            clearInterval(cylRotationInterval);
        }
    }, keyRepeatRate);
}

// PIN AND SOLVE EVENTS
function damagePin() {
    if (!pinLastDamaged || Date.now() - pinLastDamaged > pinDamageInterval) {
        var tl = new TimelineLite();
        pinHealth -= pinDamage;
        pinLastDamaged = Date.now();
        updateHealthBar();

        tl.to(pin, (pinDamageInterval / 4) / 1000, {
            rotationZ: pinRot - 2
        });
        tl.to(pin, (pinDamageInterval / 4) / 1000, {
            rotationZ: pinRot
        });
        if (pinHealth <= 0) {
            breakPin();
        }
    }
}

function breakPin() {
    var tl, pinTop, pinBott;
    gamePaused = true;
    clearInterval(cylRotationInterval);
    numPins--;
    updatePinCounter();
    pinTop = pin.find('.top');
    pinBott = pin.find('.bott');
    tl = new TimelineLite();
    tl.to(pinTop, 0.7, {
        rotationZ: -400,
        x: -200,
        y: -100,
        opacity: 0
    });
    tl.to(pinBott, 0.7, {
        rotationZ: 400,
        x: 200,
        y: 100,
        opacity: 0,
        onComplete: function () {
            if (numPins > 0) {
                gamePaused = false;
                reset();
            } else {
                outOfPins();
            }
        }
    }, 0);
    tl.play();
}

function reset() {
    cylRot = 0;
    pinHealth = 100;
    pinRot = 0;
    solveDeg = (Math.random() * 180) - 90;
    updateHealthBar();
    pin.css({
        transform: "rotateZ(" + pinRot + "deg)"
    });
    cyl.css({
        transform: "rotateZ(" + cylRot + "deg)"
    });
    driver.css({
        transform: "rotateZ(" + cylRot + "deg)"
    });
    TweenLite.to(pin.find('.top'), 0, {
        rotationZ: 0, x: 0, y: 0, opacity: 1
    });
    TweenLite.to(pin.find('.bott'), 0, {
        rotationZ: 0, x: 0, y: 0, opacity: 1
    });
    $('#collar').css('filter', 'none');
}

function fullReset() {
    cylRot = 0;
    pinHealth = 100;
    pinRot = 0;
    pin.css({ transform: "rotateZ(" + pinRot + "deg)" });
    cyl.css({ transform: "rotateZ(" + cylRot + "deg)" });
    driver.css({ transform: "rotateZ(" + cylRot + "deg)" });
    TweenLite.to(pin.find('.top'), 0, {
        rotationZ: 0, x: 0, y: 0, opacity: 1
    });
    TweenLite.to(pin.find('.bott'), 0, {
        rotationZ: 0, x: 0, y: 0, opacity: 1
    });
    $('#collar').css('filter', 'none');
}

function outOfPins() {
    gameOver = true;
    gamePaused = true;
    clearInterval(cylRotationInterval);

    $.post('http://lockpick/callback', JSON.stringify({
        success: false
    }));

    $('#wrap').fadeOut(200);
    $('#lockpickHud').fadeOut(200);

    setTimeout(function(){
        fullReset();
        updateHealthBar();
        gameOver = false;
        gamePaused = false;
    }, 300);
}

function unlock() {
    clearInterval(cylRotationInterval);
    pinsSolved++;

    // Flash effect
    $('#collar').css('filter', 'drop-shadow(0 0 20px rgba(100, 255, 100, 0.7))');

    if (pinsSolved >= pinsToSolve) {
        // Actually done
        gameOver = true;
        gamePaused = true;
        setTimeout(function(){
            $.post('http://lockpick/callback', JSON.stringify({ success: true }));
            $('#wrap').fadeOut(200);
            $('#lockpickHud').fadeOut(200);
            setTimeout(function(){
                pinsSolved = 0;
                solveDeg = (Math.random() * 180) - 90;
                pinRot = 0; cylRot = 0; lastMousePos = 0; pinHealth = 100;
                fullReset();
                updateHealthBar();
                gameOver = false; gamePaused = false;
            }, 250);
        }, 500);
    } else {
        // Next stage — new sweet spot, cylinder resets
        gamePaused = true;
        setTimeout(function(){
            cylRot = 0;
            solveDeg = (Math.random() * 180) - 90;
            cyl.css({ transform: "rotateZ(0deg)" });
            driver.css({ transform: "rotateZ(0deg)" });
            $('#collar').css('filter', 'none');
            updatePinCounter();
            gamePaused = false;
        }, 400);
    }
}

// UTIL
Util = {};
Util.clamp = function (val, max, min) {
    return Math.min(Math.max(val, min), max);
};
Util.convertRanges = function (OldValue, OldMin, OldMax, NewMin, NewMax) {
    return (((OldValue - OldMin) * (NewMax - NewMin)) / (OldMax - OldMin)) + NewMin;
};