import { Timeout, TimeoutException } from "./utils/timeout.js";


// const t1 = new Timeout(2000, 'T1 timed out');
// const t2 = new Timeout(3000, 'T2 timed out');
// t1.apply(t2.wait())
//     .then(value => console.log(value))
//     .catch(err => console.log(err.message));


// const t1 = await new Timeout(2000, 'T1 timed out').wait()
//     .then(() => console.log('Should not be here'))
//     .catch(err => console.log(err.message));


const p1 = new Promise((resolve, reject) => resolve("42"));
const p2 = new Promise((resolve, reject) => reject(new Error("Error 42")));
const t3 = new Timeout(1000, 'T3 timed out');
t3.apply(p2)
    .then(result => console.log('The answer is', result))
    .catch(err => console.log(err.message));
