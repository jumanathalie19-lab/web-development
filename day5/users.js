const loadBtn = document.getElementById('load-users');
const statusEl = document.getElementById('status');
const usersList = document.getElementById('users-list');
const filterInput = document.getElementById('filter-input');

let allUsers = [];

function renderUsers(list) {
  usersList.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No users match your filter.';
    usersList.appendChild(li);
    return;
  }
  list.forEach(user => {
    const li = document.createElement('li');
    
    const name = document.createElement('h3');
    name.textContent = user.name;
    
    const email = document.createElement('p');
    email.textContent = `Email: ${user.email}`;
    
    const city = document.createElement('p');
    city.textContent = `City: ${user.address.city}`;
    
    const company = document.createElement('p');
    company.textContent = `Company: ${user.company.name}`;
    
    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);
    usersList.appendChild(li);
  });
}

async function loadUsers() {
  try {
    loadBtn.disabled = true;
    statusEl.textContent = 'Loading...';
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    const users = await response.json();
    allUsers = users;
    renderUsers(allUsers);
    statusEl.textContent = 'Users loaded successfully.';
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener('click', loadUsers);

filterInput.addEventListener('input', () => {
  const query = filterInput.value.toLowerCase();
  const filtered = allUsers.filter(user => 
    user.name.toLowerCase().includes(query)
  );
  renderUsers(filtered);
});