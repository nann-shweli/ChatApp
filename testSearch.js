const admin = require('firebase-admin');

// We will test exactly what searchUsers runs:
async function run() {
  const usersRef = admin.firestore().collection('users');
  const emailQuery = "nannshweli11@gmail.com";
  console.log('Testing Exact Email...');
  const snap1 = await usersRef.where('email', 'in', [emailQuery, emailQuery.toLowerCase()]).get();
  console.log('Exact Matches:', snap1.docs.length);
  
  console.log('\nTesting Fallback logic locally...');
  const snap2 = await usersRef.limit(50).get();
  const fallback = snap2.docs.map(d => d.data()).filter(u => u.email && u.email.toLowerCase().includes(emailQuery.toLowerCase()));
  console.log('Fallback Matches:', fallback.length);
  if(fallback.length > 0) {
    console.log('Fallback result:', fallback[0].email);
  }
}

console.log("Ready");
