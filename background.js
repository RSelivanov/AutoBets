/**
 * Точка входа. Сайт загружен после чего начинает выполняться скрипт.
 */
$(document).ready(function () 
{
    console.log('Enabled!');
    // инициализируем tick_timer
    setInterval(tick, 1000);
    // инициализируем reload_timer

    // рисуем
    drawing('menu');
    drawing('log');
    drawing('white_list');
    //drowing('skip_button');
    
    //прокручиваем все игры чекаем их
    checkGames('nextGame');
 

});

/**
 * Слушатели событий
 */
$(function() {
    $('.menu_input').blur(function() { 
        saveSettingsOption(this.id, $(this).html());
    });
    
    $('#add_white_list').blur(function() { 
        changeWhiteList(this.id, $(this).html());
        $(this).html('');
    });

    $('body').on('click','.whitelist_delete', function(e) {
        changeWhiteList(this.id, $(this).data('id'));
        console.log('click');
    });
}); 

/**
 * Выполняется каждую секунду
 */
function tick() 
{

}

function checkGames(key)
{
    switch (key) {
        case 'nextGame':
            var $_nextGamesArray = getJqueryObjFromHtml('$_nextGamesArray');
            for (var i = 0; i < $_nextGamesArray.length; i++) {
                var gamesRow = $_nextGamesArray[i];
                checkNextGame(gamesRow);
            }
        case 'pastGame':
            var $_pastGamesArray = getJqueryObjFromHtml('$_pastGamesArray');
            for (var i = 0; i < $_pastGamesArray.length; i++) {
                var gamesRow = $_pastGamesArray[i];
                checkPastGame(gamesRow);
            }
    }
}

/**
 * Проверет будующие игры
 * @return boolean <p>Результат выполнения метода</p>
 */
function checkNextGame(gamesRow)
{
    var settings = getStorage('settings');

    var id = getGameInfo('id', gamesRow); 
    var side = null;

    var amount = settings.amount;
    
    var nameTeam1 = getGameInfo('nameTeam1', gamesRow);
    var nameTeam2 = getGameInfo('nameTeam2', gamesRow);

    // проверям а не стоит ли ставка уже на этом матче
    if(hasClass('userbet-team1', gamesRow) || hasClass('userbet-team1', gamesRow))
    {
        console.log('Скипаем ствка на эту игру уже установлена');
        return false;
    }
    
    // проверям не пропущена ли игра
    var skipObj = getStorage('skip');
    var skipArray = parseStringToArray(skipObj.skip);
    //if (skipArrayId[id] !== undefined)
    if(skipArray.indexOf( id ) !== -1)
    {
        console.log('Скипаем id: %s', id);
        return false;
    }
    
    // проверям включен ли вайтлист
    if(settings.white_list === true)
    {        
        // проверям есть ли одна из команд в white листе
        var whiteListObj = getStorage('white_teams');
        var whiteTeamsArray = parseStringToArray(whiteListObj.white_teams);
        if(whiteTeamsArray.indexOf( nameTeam1 ) === -1 && whiteTeamsArray.indexOf( nameTeam2 ) === -1)
        {
            console.log('Скипаем команды не в вайтлисте: %s, %s', nameTeam1, nameTeam2);
            wrateLogLine('Скипаем команды не в вайтлисте: '+nameTeam1+','+nameTeam2);
            return false;
        }
    }
    
    // проверяем время до начала игры
    var timeToStartUnix = getGameInfo('timeToStart', gamesRow);
    var timeToStartMin = convertUnixtimeToMinutes(timeToStartUnix);

    if (timeToStartMin > settings.time_to_start)
    {
        console.log('Скипаем время: %s', timeToStartMin);
        return false;
    }

    // проверяем процент коофициэтна первой и второй команды
    var coefficientPercentTeam1 = getGameInfo('coefficientPercentTeam1', gamesRow);
    var coefficientPercentTeam2 = getGameInfo('coefficientPercentTeam2', gamesRow);

    if (coefficientPercentTeam1 < settings.percent_coefficient && coefficientPercentTeam2 < settings.percent_coefficient)
    {
        console.log('Скипаем процент команды %s: %s %s: %s', nameTeam1, coefficientPercentTeam1, nameTeam2, coefficientPercentTeam2);
        return false;
    }
    
    // проверям на TBD
    if (nameTeam1 === 'TBD' && nameTeam2 === 'TBD')
    {
        console.log('Скипаем имя одной из команд TBD: %s %s', nameTeam1, nameTeam2);
        return false;
    }

    var bankTeam1 = getGameInfo('bankTeam1', gamesRow);
    var bankTeam2 = getGameInfo('bankTeam2', gamesRow);
    var winbank = 0;
    var losebank = 0;
    
    if (coefficientPercentTeam1 >= settings.percent_coefficient)
    {
        side = 1;
        winbank  = parseInt(bankTeam1);
        losebank = parseInt(bankTeam2);
    }
    
    if (coefficientPercentTeam2 >= settings.percent_coefficient)
    {
        side = 2;
        winbank  = parseInt(bankTeam1);
        losebank = parseInt(bankTeam2);
    }
    
    //--------------------------------------------------------------------------
   
    var lostBets = getStorage('lost_bets');
    // подгружаем все ставки из localstorige
    var betsObj = getStorage('bets');
    // формируем новую стаку
    var betObj = new Object();
    
    // отыгрываем ставку
    if(settings.win_back == true && !$.isEmptyObject(lostBets)){
        // берем первую ствку из объекта
        for (var key in lostBets) {
            
            // записываем amount отыгрывающейся в win_back
            betObj.win_back = lostBets[key];
            //удаляем!!!!!!!
            
            break;
        }
        // получаем ставку покрывающую проигрышь
        amount = calculateAmountWithCoefficient(winbank, losebank, amount, betObj.win_back);
    }
    
    if(amount < 1)
    {
        console.log('Ставка меньше 1 (s%) устанавливаем дефолтную ставку (%s)', amount, settings.amount);
        amount = settings.amount;
    }
    
    var wallet = getJqueryObjFromHtml('$_wallet');
    // проверям хватает ли денег на ставку
    if(wallet < amount)
    {
        console.log('Скипаем ставка (%s) привышает остаток в бумажнике (%s)', amount, wallet);
        return false;
    }
    
    betObj.side = side;
    betObj.amount = amount;
    
    betsObj[id] = betObj;
    setStorage('bets', betsObj);
    
    console.log('plase bet '+id+' '+side+' '+amount);

    // отправляем ajax (id, side, amount)
    //placeBet(id, side, amount); 
    return true;
}

function checkPastGame(gamesRow)
{
    var settings = getStorage('settings');
    var id = getGameInfo('id', gamesRow); 
    
    // подгружаем все ставки из localstorige
    var betsObj = getStorage('bets');
    
    // берем ставку с текущем id
    var betObj = new Object();
    betObj = betsObj[id];
    
    var winner = null;
    if(typeof betObj != "undefined") {
        
        if(hasClass('winner-team1', gamesRow)){
            winner = 1;
        }
        
        if(hasClass('winner-team2', gamesRow)){
            winner = 2;
        }
        
        // если матч перенесен или отменен
        if(hasClass('result-postponed', gamesRow) || hasClass('no-result', gamesRow)){
            // удаляем игру
            delete betsObj[id];
            setStorage('bets', betsObj);
            return true;
        }
        
        // если игра выйграна
        if(winner != null && winner == betObj.side){
            // если игра отыгывалась убираем игру с отыгровки
            if(settings.win_back == true){
                var lostBets = getStorage('lost_bets');
                delete lostBets[id];
                setStorage('lost_bets', lostBets);
            }
            // удаляем игру
            delete betsObj[id];
            setStorage('bets', betsObj);
            return true;
        }
        
        // если игра проиграна
        if(winner != null && winner != betObj.side){ 
            // добавляем игру на отыгровку если отыгровка включена
            if(settings.win_back == true){
                var lostBets = getStorage('lost_bets');
                lostBets[id] = betObj.amount;
                setStorage('lost_bets', lostBets);
            }
            // удаляем игру
            delete betsObj[id];
            setStorage('bets', betsObj);
            return true;
        }
    }
    return true;
}
/**
 * Сохраняет объект с информацией в память браузера
 * @param string key <p>Ключ</p>
 * @param JsObject obj <p>Значение</p>
 * @return boolean <p>Результат выполнения метода</p>
 */
function setStorage(key, obj)
{
    var jsonObj = JSON.stringify(obj);
    localStorage.setItem(key, jsonObj);
    return true;
}

/**
 * Получет объект с информацией из память браузера
 * @param string key <p>Ключ</p>
 * @return JsObject <p>Значение</p>
 */
function getStorage(key)
{
    switch (key) {
        case 'settings':

            var localStorageSettings = localStorage.getItem(key);
            var settingsObj = JSON.parse(localStorageSettings);

            if (settingsObj == null)
            {
                var settingsObj = new Object();
                // сумма ствки
                settingsObj.amount = 1;
                // за сколько до начала матча делать ставку в минутах
                settingsObj.time_to_start = 3;
                // коэффициент который должна иметь команда в процентах
                settingsObj.percent_coefficient = 60;
                // отыгрываться или нет
                settingsObj.win_back = false;
                // whitelist
                settingsObj.white_list = false;
                
                setStorage('settings', settingsObj);
            }
            return settingsObj;
        case 'skip':
            var localStorageSkip = localStorage.getItem(key);
            var skipObj = JSON.parse(localStorageSkip);
            
            if (skipObj == null)
            {
                var skipObj = new Object();
                skipObj.skip = '';
                setStorage('skip', skipObj);
            }
            return skipObj;
        case 'white_teams':
            var localStorageWhiteTeams = localStorage.getItem(key);
            var whiteTeamsObj = JSON.parse(localStorageWhiteTeams);
            
            if (whiteTeamsObj == null)
            {
                var whiteTeamsObj = new Object();
                whiteTeamsObj.white_teams = '';
                setStorage('white_teams', whiteTeamsObj);
            }
            return whiteTeamsObj;
        default:

            var localStorageStr = localStorage.getItem(key);
            var defaultObj = JSON.parse(localStorageStr);

            if (defaultObj == null)
            {
                var defaultObj = new Object();
                setStorage(key, defaultObj);
            }
            return defaultObj;
    }
}

/**
 * Получает jQuery объект со страницы
 * @param string key <p>Ключ</p>
 * @return JsObject <p>Значение</p>
 */
function getJqueryObjFromHtml(key)
{
    switch (key)
    {
        case '$_nextGamesArray':
            return $("#bets-next .b-games").children();
        case '$_liveGamesArray':
            return $("#bets-live .b-games").children();
        case '$_pastGamesArray':
            return $("#bets-past .b-games").children();
        case '$_sessionToken':
            return $(".chat-settings-nick-change__input").data('session');
        case '$_wallet':
            var wallet = $("#wallet").html();
            wallet = wallet.replace("<small></small>", "");
            wallet = Math.floor(wallet);
            return wallet;
        case '$_log':
            return $("#downloadAppBanner");
    }
}
/**
 * Получает string по ключу из jQuery объекта
 * @param JsObject obj <p>Ключ</p>
 * @return string <p>Результат выполения метода</p>
 */
function getGameInfo(key, obj)
{
    switch (key)
    {
        case 'id':
            return String($(obj).data('id'));
        case 'timeToStart':
            return String($(obj).children('.b-game').children('.bet-time-day').children('.bet-info').children('.bet-time-left').data('timestamp'));
        case 'coefficientPercentTeam1':
            var coefficientPercentTeam1 = $(obj).children('.b-game').children('.b-team1').children('.b-koef').children('.b-betextrainfo').children('.stat-proc').html();
            coefficientPercentTeam1 = coefficientPercentTeam1.slice(0, -1);
            return String(coefficientPercentTeam1);
        case 'coefficientPercentTeam2':
            var coefficientPercentTeam2 = $(obj).children('.b-game').children('.b-team2').children('.b-koef').children('.b-betextrainfo').children('.stat-proc').html();
            coefficientPercentTeam2 = coefficientPercentTeam2.slice(0, -1);
            return String(coefficientPercentTeam2);
        case 'nameTeam1':
            return String($(obj).children('.b-game').children('.b-team1').children('.b-teamname').html());
        case 'nameTeam2':
            return String($(obj).children('.b-game').children('.b-team2').children('.b-teamname').html());
        case 'bankTeam1':
            var bankTeam1 = $(obj).children('.b-game').children('.b-team1').children('.b-koef').children('.stat-abs').html();
            return String(bankTeam1.replace("<em></em>", ""));
        case 'bankTeam2':
            var bankTeam2 = $(obj).children('.b-game').children('.b-team2').children('.b-koef').children('.stat-abs').html();
            return String(bankTeam2.replace("<em></em>", ""));
    }
}

/**
 * Проверям уставновлена ли ставка на матч
 * @param JsObject obj <p>Ключ</p>
 * @return boolean <p>Результат выполнения метода</p>
 */
function hasClass(key, obj)
{
    switch (key)
    {
        case 'userbet-team1':
            if($(obj).hasClass("userbet-team1")) { return true; }
        case 'userbet-team2':
            if($(obj).hasClass("userbet-team2")) { return true; }
        case 'winner-team1':
            if($(obj).hasClass("winner-team1")) { return true; }
        case 'winner-team2':
            if($(obj).hasClass("winner-team2")) { return true; }
        case 'result-postponed':
            if($(obj).hasClass("result-postponed")) { return true; }
        case 'no-result':
            if($(obj).hasClass("no-result")) { return true; }
        return false;
    }
}
/**
 * Сохраняем опцию настроек
 * @param String id <p>Ид</p>
 * @param String value <p>Значение</p>
 * @return boolean <p>Результат выполнения метода</p>
 */
function saveSettingsOption(id, value)
{
    if(value === 'true'){value = true;}
    if(value === 'false'){value = false;}
    var settings = getStorage('settings');
    settings[id] = value;
    setStorage('settings', settings);
    log('Сохраняем опцию: ' + id + ' значение: ' + value);
    return true;
}

function changeWhiteList(id, value)
{
    if(id === 'add_white_list'){
        // достаем объект из памяти
        var whiteListObj = getStorage('white_teams');
        // конвертируем в массив
        var whiteTeamsArray = parseStringToArray(whiteListObj.white_teams);
        // добавляем новый элемент
        whiteTeamsArray.push(value);
        // конвертируем массив в строку
        var whiteListString = mergeArraytoString(whiteTeamsArray);
        // заменяем свойство в объекте
        whiteListObj.white_teams = whiteListString;
        // сохраняем в панять
        setStorage('white_teams', whiteListObj);
        // перерисовывем white list
        drawing('white_list');
        log('Добавляем команду в white list: ' + value);
        return true;
    }
    if(id === 'whitelist_delete'){
        // достаем объект из памяти
        var whiteListObj = getStorage('white_teams');
        // конвертируем в массив
        var whiteTeamsArray = parseStringToArray(whiteListObj.white_teams);
        log('Удаляем команду из white list: ' + whiteTeamsArray[value]);
        // удаляем элемент из массива
        whiteTeamsArray.splice(value, 1);
        // конвертируем массив в строку
        var whiteListString = mergeArraytoString(whiteTeamsArray);
        // заменяем свойство в объекте
        whiteListObj.white_teams = whiteListString;
        // сохраняем в панять
        setStorage('white_teams', whiteListObj);
        // перерисовывем white list
        drawing('white_list');
        return true;
    }
    return false;
}

/**
 * Конвертируем время из Unix в минуты
 * @param Unixtime unixtime <p>Время в формате Unixtime</p>
 * @return int <p>Результат выполения метода</p>
 */
function convertUnixtimeToMinutes(unixtime)
{
    var min = (unixtime - Math.round((new Date()).getTime() / 1000))/60;
    return min.toFixed();
}

/**
 * Конвертируем время из Unix в минуты d.m.y h:m
 * @param Unixtime unixtime <p>Время в формате Unixtime</p>
 * @return String <p>Результат выполения метода</p>
 */
function convertUnixtimeToDate(unixtime)
{
    var date = new Date(Number(unixtime));
    
    var year = date.getFullYear();
    var month = date.getMonth();
    var day = date.getDate();
    var hours = date.getHours();
    var minutes = date.getMinutes();

    return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes+': ';
}

/**
 * Парсит строку в массив разделенную ","
 * @param String string <p>Строка</p>
 * @return Array <p>Массив</p>
 */
function parseStringToArray(string)
{
    if(string !== "") {
        return string.split(',');
    }
    return '';
}

function mergeArraytoString(array)
{
    if(array !== null) {
        return array.join(',')
    }
    return null;
}

function calculateAmountWithCoefficient(winbank, losebank, amount, lostamount){
    var coeff = Number(losebank)/Number(winbank);
    //console.log('calculateAmountWithCoefficient: winbank ('+winbank+') losebank ('+losebank+') amount ('+amount+') lostamount ('+lostamount+')');
    //console.log('calculateAmountWithCoefficient: coeff ('+coeff+') new amount ('+Math.ceil((Number(amount) + Number(lostamount))/coeff)+')');
    return Math.ceil((Number(amount) + Number(lostamount))/coeff);
}

/**
 * Отрисовывет html элементы на странице
 * @param string key <p>Ключ</p>
 * @return
 */
function drawing(key)
{
    switch (key)
    {
        case 'menu':
            // получаем объект с настройкми
            var settings = getStorage('settings');
            
            var menu = ''+
            '<table class="table" style="width: 100%;">'+
              '<thead>'+
                '<tr>'+
                  '<th scope="col">#</th>'+
                  '<th scope="col">Опция</th>'+
                  '<th scope="col">Значение</th>'+
                '</tr>'+
              '</thead>'+
              '<tbody>'+
                '<tr>'+
                  '<th scope="row">1</th>'+
                  '<td>Сумма ставки:</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="menu_input" id="amount">' + settings.amount + '</div></td>'+
                '</tr>'+
                '<tr>'+
                  '<th scope="row">2</th>'+
                  '<td>Делать ставка за мин:</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="menu_input" id="time_to_start">' + settings.time_to_start + '</div></td>'+
                '</tr>'+
                '<tr>'+
                  '<th scope="row">3</th>'+
                  '<td>Процент коэффициента:</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="menu_input" id="percent_coefficient">' + settings.percent_coefficient + '</div></td>'+
                '</tr>'+
                '<tr>'+
                  '<th scope="row">4</th>'+
                  '<td>Отыгрывать (true/false):</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="menu_input" id="win_back">' + settings.win_back + '</div></td>'+
                '</tr>'+
                 '<tr>'+
                  '<th scope="row">5</th>'+
                  '<td>White list (true/false):</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="menu_input" id="white_list">' + settings.white_list + '</div></td>'+
                '</tr>'+
                '</tr>'+
                 '<tr>'+
                  '<th scope="row">5</th>'+
                  '<td>Добавть команду:</td>'+
                  '<td><div onkeyup="" contenteditable="true" class="whitelist_input" id="add_white_list"></div></td>'+
                '</tr>'+
              '</tbody>'+
            '</table>'+
            '</br>'+
            '<div id="white_list_container"></div>';
            $(".right_inner").html(menu);
            //break;
        case 'white_list':
            var whiteListObj = getStorage('white_teams');
            var whiteTeamsArray = parseStringToArray(whiteListObj.white_teams);
            var whiteTeamsList = '<div><strong>White List :</strong></div>'+
            '<table class="table" style="width: 100%;">'+
              '<thead>'+
                '<tr>'+
                  '<th scope="col">#</th>'+
                  '<th scope="col">Название команды</th>'+
                  '<th scope="col">Действие</th>'+
                '</tr>'+
              '</thead>'+
              '<tbody>';
                for (var i = 0; i < whiteTeamsArray.length; i++) {
                    whiteTeamsList += 
                    '<tr>'+
                      '<th scope="row">'+i+'</th>'+
                      '<td>'+whiteTeamsArray[i]+'</td>'+
                      '<td><div class="whitelist_delete" id="whitelist_delete" data-id="'+i+'" style="cursor: pointer;">Удалить</div></td>'+
                    '</tr>';
                }
                whiteTeamsList += 
                '</tbody>'+
            '</table>'+
            '</br>';
            
            $("#white_list_container").html(whiteTeamsList);
            //break;
        case 'log':
            var content = '<p>Лог...</p>';
            var $_log = getJqueryObjFromHtml('$_log');
            $_log.replaceWith("<div id='downloadAppBanner'></div>");
            var $_log = getJqueryObjFromHtml('$_log');
            $_log.css("overflow", "auto");
            $_log.css("height", "200px");
            $_log.html(content);
            
            var logObj = getStorage('log');
            fillLog(logObj);
            
        case 'skip_button':
            var $_nextGamesArray = getJqueryObjFromHtml('$_nextGamesArray');
            for(var i = 0; i < $_nextGamesArray.length; i++) {
                var gamesRow = $_nextGamesArray[i];
                
            }
    }
}
function log(string){wrateLogLine(string);}
function wrateLogLine(string)
{
    // тут обновляем в localstorege
    var dateUnix = Date.now();
    var logObj = getStorage('log');
    logObj[dateUnix] = string;
    setStorage('log', logObj); 
    
    addLog(string);
}

function addLog(string){
    var $_log = getJqueryObjFromHtml('$_log');
    var content = $_log.html();
    content += '<p>'+convertUnixtimeToDate(Date.now()) + string+'</p>';
    $_log.html(content);
    
    $($_log).scrollTop(999999);
}

function fillLog(obj){
    var $_log = getJqueryObjFromHtml('$_log');
    var content = '';
    for (key in obj) {
        content += '<p>'+convertUnixtimeToDate(key) + obj[key]+'</p>';
    }
    $_log.html(content);
    
    $($_log).scrollTop(999999);
}

function checkBet()
{

}

/**
 * Делает ставку
 * @param string id <p>Ид матча</p>
 * @param string side <p>Команда 1 или 2</p>
 * @param string amount <p>Количество денег в рублях</p>
 * @return boolean <p>Результат выполнения метода</p>
 */
function placeBet(obj, id, side, amount) 
{
    console.log("Деламем ставку id: %i side: %i amount: %i token: %s", id, side, amount, getJqueryObjFromHtml('$_sessionToken'));
    return true;
}
