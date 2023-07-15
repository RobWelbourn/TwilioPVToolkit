/**
 * Module which contains some datasets for use with the sample apps.  
 */

const test = new Map([              // Modify these to be your own test numbers
    ['+13395553480', 'Orpheus'],    
    ['+13395559670', 'Eurydice'],
    ['+16175555354', 'Hades']
]);

const allBad = new Map([
    ['+14045554337', 'Busy'],       // set a Twilio number to return <Reject reason="busy"/>
    ['+14635554835', 'Blocked'],    // set a Twilio number to return <Reject/>
    ['+15551234567', 'Invalid'],    // not a valid number
    ['nonsense', 'Not a number']
]);

const allButOneBad = new Map([
    ['+16175555354', 'Orpheus'],    // Modify to use your own number
    ['+14045554337', 'Busy'],       // Set a Twilio number to return <Reject reason="busy">
    ['+14635554835', 'Blocked'],    // Set a Twilio number to return <Reject/>
    ['+15551234567', 'Invalid'],    // 404 failed
    ['nonsense', 'Not a number']    // will fail REST API
]);

const apptReminder = {              // Modify the numbers to be your own test numbers
    to: '+161755555354',
    from: '+16175550182',
    forward: '+13395553480',
    patient: 'Orpheus',
    doctor: 'Dr Love',
    time: '12:30 pm',
    date: 'Thursday, 9th March'
};

const apptBadXfer = {
    to: '+16175555354',             // Modify this
    from: '+16175550182',           // and this
    forward: 'nonsense',
    patient: 'Orpheus',
    doctor: 'Dr Love',
    time: '12:30 pm',
    date: 'Thursday, 9th March'
};

const apptBusyPatient = {
    to: '+14045554337',             // Use your own busy number
    from: '+16175550182',           // Modfiy this
    forward: '+13395553480',        // and this
    patient: 'Orpheus',
    doctor: 'Dr Love',
    time: '12:30 pm',
    date: 'Thursday, 9th March'  
};

const apptXferRejected = {
    to: '+16175555354',             // Modify this
    from: '+16175550182',           // and this
    forward: '+14635554835',        // Set a Twilio number to return 603 Busy
    patient: 'Orpheus',
    doctor: 'Dr Love',
    time: '12:30 pm',
    date: 'Thursday, 9th March'
};

const apptFailCall = {
    to: 'nonsense',                 // will fail REST API
    from: '+16175550182',           // Modify this
    forward: '+13395553480',        // and this
    patient: 'Orpheus',
    doctor: 'Dr Love',
    time: '12:30 pm',
    date: 'Thursday, 9th March'  
};

export const datasets = new Map([
    ['test', test],
    ['bad', allBad],
    ['one', allButOneBad],
    ['appt', apptReminder],
    ['apptbadxfer', apptBadXfer],
    ['apptbusy', apptBusyPatient],
    ['apptfail', apptFailCall],
    ['apptxferrej', apptXferRejected]
]);