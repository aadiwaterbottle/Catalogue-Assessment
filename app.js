function renderRecords(records) {
  const catalogue = document.querySelector('.catalogue-grid');
  if (!catalogue) return;
  catalogue.innerHTML = '';

  records.forEach(record => {
    catalogue.innerHTML += `

    <div class="record-card bg-white rounded-3xl overflow-hidden shadow-xl hover:scale-[1.02] transition duration-300">

        <div class="relative">

            <img
            src="${record.image_url || ''}"
            class="w-full aspect-square object-cover">

            <button
            onclick="addToCollection('${(record.artist||'').replace(/'/g, "\\'")}', '${(record.album||'').replace(/'/g, "\\'")}', '${(record.image_url||'').replace(/'/g, "\\'")}')"
            class="absolute bottom-4 right-4 bg-black text-white px-4 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-red-600 transition">
                Add To Collection
            </button>
        </div>

        <div class="p-6">

            <h2 class="text-xl font-black uppercase">
                ${record.artist || ''}
            </h2>

            <p class="text-zinc-500 italic mt-1">
                ${record.album || ''}
            </p>

            <div class="mt-4 flex items-center justify-between">
                <span class="text-xs uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full">
                    ${record.genre || 'Music'}
                </span>
            </div>
        </div>
    </div>
    `;
  });
}

function showSection(section) {
    // simple navigation handler used by header buttons
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(n => n.classList.remove('active'));
    const clicked = Array.from(navLinks).find(n => n.dataset.section === section);
    if (clicked) clicked.classList.add('active');

    if (section === 'collection') {
        window.location.href = 'collection.html';
        return;
    }

    if (section === 'popular') {
        window.location.href = 'popular.html';
        return;
    }

    if (section === 'new') {
        window.location.href = 'new.html';
        return;
    }

    if (section === 'home') {
        window.location.href = 'index.html';
        return;
    }

    // placeholder for other sections
    console.log('Navigate to section:', section);
}


async function searchSpotify() {
        const query = (document.getElementById('searchInput').value || '').trim();
        if (!query) {
                // empty query — load default records
                return loadRecords();
        }

        try {
            const response = await fetch(`/api/search-albums/${encodeURIComponent(query)}`);
            if (!response.ok) {
                console.error('Search failed', response.statusText);
                return;
            }

            const albums = await response.json();
            const formattedAlbums = (albums || []).map(album => ({
                artist: album.artists?.[0]?.name || 'Unknown',
                album: album.name || 'Untitled',
                image_url: album.images?.[0]?.url || '',
                genre: 'Spotify Album'
            }));
            renderRecords(formattedAlbums);
        } catch (err) {
            console.error('Search error', err);
        }
}

async function loadRecords() {
    try {
        const response = await fetch('/api/records');
        const records = await response.json();
        renderRecords(records);
    } catch (err) {
        console.error('Failed to load records', err);
    }
}

// Initial load
loadRecords();

async function addToCollection(artist, album, image_url) {

    await fetch('/api/collection', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            artist,
            album,
            image_url
        })
    });

    alert('Album Added To Collection');
}
// client-only file — server routes were removed (should live in server.js)