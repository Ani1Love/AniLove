
    const ANILIST_CLIENT_ID = '49024';
    const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
    const animeMemoryStore = {};
    let currentAnimeInModal = null;
    let isOverviewExpanded = false;
    let activeSearchQuery = '';
    let typeAheadDebounceTimer = null;
    let typeAheadAbortController = null;
    let myAnimeList = JSON.parse(localStorage.getItem('anilove_mylist') || '[]');

    // AniList Authentication & Two-Way Sync Settings
    let anilistUser = JSON.parse(localStorage.getItem('anilove_anilist_user') || 'null');
    let anilistToken = localStorage.getItem('anilove_anilist_token') || '';
    let syncProgressEnabled = localStorage.getItem('anilove_sync_progress') !== 'false';
    let syncPlanningEnabled = localStorage.getItem('anilove_sync_planning') !== 'false';

    function initTheme() {
      const savedTheme = localStorage.getItem('anilove_theme') || 'dark';
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      document.documentElement.classList.toggle('light', !isDark);
      localStorage.setItem('anilove_theme', isDark ? 'dark' : 'light');
      lucide.createIcons();
    }

    function showToast(msg, icon = '✓') {
      const toast = document.getElementById('appToast');
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toastIcon').textContent = icon;
      toast.classList.remove('hidden');
      toast.classList.add('toast-animate');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }

    // Authenticated AniList GraphQL Caller
    async function queryAniList(query, variables, useAuth = true) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };
        if (useAuth && anilistToken) {
          headers['Authorization'] = `Bearer ${anilistToken}`;
        }
        const response = await fetch(ANILIST_ENDPOINT, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ query, variables })
        });
        const data = await response.json();
        return data.data;
      } catch (err) {
        console.error('AniList API Error:', err);
        return null;
      }
    }

    // Clean Description Handler
    function formatAnimeDescription(rawDesc, animeTitle) {
      if (!rawDesc || typeof rawDesc !== 'string' || !rawDesc.trim()) {
        return `${animeTitle || 'This series'} follows an engaging story filled with incredible characters, emotional moments, and captivating animation. Explore all episodes and details in high definition.`;
      }

      let clean = rawDesc.replace(/~![\s\S]*?!~/g, '');
      clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      clean = clean.replace(/<br\s*[\/]?>/gi, '\n');
      clean = clean.replace(/<\/?p>/gi, '\n');
      clean = clean.replace(/<[^>]+>/g, '');
      clean = clean.replace(/__|\*\*|\*|~~/g, '');

      const entityMap = {
        '&quot;': '"',
        '&apos;': "'",
        '&#039;': "'",
        '&#39;': "'",
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&ndash;': '–',
        '&mdash;': '—',
        '&nbsp;': ' '
      };
      clean = clean.replace(/&[#0-9a-zA-Z]+;/g, (m) => entityMap[m] || m);
      clean = clean.replace(/\n{3,}/g, '\n\n').trim();

      if (!clean) {
        return `${animeTitle || 'This series'} follows an engaging story filled with incredible characters, emotional moments, and captivating animation.`;
      }
      return clean;
    }

    const CATALOG_QUERY = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $search: String, $genre: String) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: $sort, season: $season, seasonYear: $seasonYear, search: $search, genre: $genre, isAdult: false) {
            id
            title {
              english
              romaji
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
            averageScore
            format
            seasonYear
            season
            status
            episodes
            duration
            popularity
            favourites
            genres
            description
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            studios {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    async function loadHomePageData() {
      const trendingData = await queryAniList(CATALOG_QUERY, {
        page: 1,
        perPage: 6,
        sort: ['TRENDING_DESC']
      }, false);
      if (trendingData && trendingData.Page && trendingData.Page.media) {
        renderCardGrid('trendingGrid', trendingData.Page.media);
      }

      const currentYear = new Date().getFullYear();
      const seasonalData = await queryAniList(CATALOG_QUERY, {
        page: 1,
        perPage: 6,
        season: 'SUMMER',
        seasonYear: currentYear,
        sort: ['POPULARITY_DESC']
      }, false);
      if (seasonalData && seasonalData.Page && seasonalData.Page.media) {
        document.getElementById('seasonHeading').textContent = `Airing in Summer ${currentYear}`;
        renderCardGrid('seasonalGrid', seasonalData.Page.media);
      }

      const topData = await queryAniList(CATALOG_QUERY, {
        page: 1,
        perPage: 6,
        sort: ['SCORE_DESC']
      }, false);
      if (topData && topData.Page && topData.Page.media) {
        renderCardGrid('topRatedGrid', topData.Page.media);
      }
    }

    function getGenreColorClasses(genre) {
      switch ((genre || '').toLowerCase()) {
        case 'action':
          return 'bg-red-950/60 border-red-500/40 text-red-300';
        case 'adventure':
          return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
        case 'comedy':
          return 'bg-amber-950/60 border-amber-500/40 text-amber-300';
        case 'drama':
          return 'bg-orange-950/60 border-orange-500/40 text-orange-300';
        case 'fantasy':
          return 'bg-purple-950/60 border-purple-500/40 text-purple-300';
        case 'romance':
          return 'bg-pink-950/60 border-pink-500/40 text-pink-300';
        case 'sci-fi':
          return 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300';
        case 'supernatural':
          return 'bg-violet-950/60 border-violet-500/40 text-violet-300';
        default:
          return 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300';
      }
    }

    function renderCardGrid(elementId, animeList) {
      const container = document.getElementById(elementId);
      if (!container) return;

      if (!animeList || animeList.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-slate-400">No matching series found. Try another keyword!</div>`;
        return;
      }

      animeList.forEach(item => {
        animeMemoryStore[item.id] = item;
      });

      container.innerHTML = animeList.map(anime => {
        const title = anime.title.english || anime.title.romaji || 'Untitled';
        const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.1';
        const year = anime.seasonYear || (anime.startDate ? anime.startDate.year : '2026');
        const format = anime.format || 'TV';
        const cover = anime.coverImage ? (anime.coverImage.large || anime.coverImage.extraLarge) : '';
        const genres = (anime.genres || []).slice(0, 2).join(' • ');

        const listItem = myAnimeList.find(x => x.id === anime.id);
        const inListBadge = listItem ? `
          <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-white text-[9px] font-black uppercase tracking-wider shadow-md border border-white/20 z-10">
            ${listItem.status || 'In List'}
          </div>
        ` : '';

        return `
          <div 
            class="anime-card-box group relative flex flex-col space-y-2.5 rounded-2xl bg-[#0e111c] border border-[#1e2338] p-2"
            onclick="handleCardClick(event, ${anime.id})"
          >
            <div class="relative aspect-[3/4.2] w-full rounded-xl overflow-hidden bg-black/40">
              <img src="${cover}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              
              <div class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-extrabold flex items-center gap-1 border border-white/10 shadow-md z-10">
                <span class="text-amber-400 font-normal">★</span> ${score}
              </div>

              ${inListBadge}

              <!-- Preview Overlay with Action Buttons -->
              <div class="preview-actions-overlay absolute inset-0 bg-gradient-to-t from-[#040508]/95 via-[#040508]/75 to-transparent p-3 flex flex-col justify-end text-left rounded-xl z-20">
                <div class="space-y-2">
                  <span class="inline-block px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                    Preview
                  </span>
                  <h4 class="text-xs font-extrabold text-white line-clamp-1 leading-tight">${title}</h4>
                  <p class="text-[10px] text-cyan-300 font-semibold line-clamp-1">${genres}</p>
                  
                  <div class="flex items-center gap-2 pt-1">
                    <button 
                      type="button"
                      onclick="triggerPlayAction(event, ${anime.id})" 
                      class="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg> Play
                    </button>
                    <button 
                      type="button"
                      onclick="triggerInfoAction(event, ${anime.id})" 
                      class="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-white/20 border border-white/20 text-white text-xs font-bold shadow-md active:scale-95 transition cursor-pointer"
                    >
                      Info
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div class="px-1 pb-1 space-y-0.5">
              <h3 class="font-extrabold text-xs sm:text-sm text-white line-clamp-2 leading-snug group-hover:text-sky-400 transition">
                ${title}
              </h3>
              <p class="text-[11px] font-semibold text-slate-400">
                ${format} · ${year}
              </p>
            </div>
          </div>
        `;
      }).join('');
      lucide.createIcons();
    }

    function handleCardClick(event, animeId) {
      if (event.target.closest('button')) return;
      openAnimeDetails(animeId);
    }

    function triggerPlayAction(event, animeId) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      openAnimeDetails(animeId);
      setTimeout(() => {
        startDetailVideoPlayback(1);
      }, 300);
    }

    function triggerInfoAction(event, animeId) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      openAnimeDetails(animeId);
    }

    // ================= OPEN DETAILED ANIME INTERFACE =================
    async function openAnimeDetails(animeId) {
      let anime = animeMemoryStore[animeId];

      document.getElementById('animeDetailView').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.getElementById('detailOverviewText').textContent = "Loading synopsis...";
      document.getElementById('overviewToggleBtn').classList.add('hidden');

      // Skeletons
      document.getElementById('detailRecommendationsGrid').innerHTML = `
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a]"></div>
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a]"></div>
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a]"></div>
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a] hidden sm:block"></div>
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a] hidden sm:block"></div>
        <div class="aspect-[3/4.2] rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a] hidden sm:block"></div>
      `;
      document.getElementById('detailWatchOrderGrid').innerHTML = `
        <div class="h-16 rounded-2xl bg-[#0e111c] animate-pulse border border-[#1e243a]"></div>
      `;

      if (!anime || !anime.description || !anime.studios || !anime.genres) {
        const query = `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              title {
                english
                romaji
                native
              }
              coverImage {
                extraLarge
                large
              }
              bannerImage
              averageScore
              format
              seasonYear
              season
              status
              episodes
              duration
              popularity
              favourites
              genres
              description
              startDate {
                year
                month
                day
              }
              endDate {
                year
                month
                day
              }
              studios {
                nodes {
                  name
                }
              }
            }
          }
        `;
        const res = await queryAniList(query, { id: animeId }, false);
        if (res && res.Media) {
          anime = Object.assign(anime || {}, res.Media);
          animeMemoryStore[animeId] = anime;
        }
      }

      if (!anime) return;
      currentAnimeInModal = anime;

      const banner = anime.bannerImage || (anime.coverImage ? (anime.coverImage.extraLarge || anime.coverImage.large) : '');
      document.getElementById('detailBannerBox').style.backgroundImage = `url('${banner}')`;
      document.getElementById('detailCoverImg').src = anime.coverImage ? (anime.coverImage.extraLarge || anime.coverImage.large) : '';

      const title = anime.title.english || anime.title.romaji || anime.title.native || 'Anime Details';
      document.getElementById('detailTitleText').textContent = title;
      const studioName = (anime.studios && anime.studios.nodes && anime.studios.nodes.length > 0) ? anime.studios.nodes[0].name : 'Animation Studio';
      document.getElementById('detailStudioBadge').textContent = studioName;
      
      const scoreFormatted = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.2';
      document.getElementById('detailScoreText').textContent = `${scoreFormatted} Score (${anime.averageScore || 82}%)`;
      document.getElementById('detailEpisodesText').textContent = `${anime.episodes || '12+'} Episodes`;

      const formattedStatus = anime.status ? anime.status.charAt(0).toUpperCase() + anime.status.slice(1).toLowerCase().replace(/_/g, ' ') : 'Finished';
      document.getElementById('statStatus').textContent = formattedStatus;
      document.getElementById('statFormat').textContent = anime.format ? anime.format.toUpperCase() : 'TV';
      document.getElementById('statYear').textContent = anime.seasonYear || (anime.startDate && anime.startDate.year ? anime.startDate.year : '2024');
      document.getElementById('statDuration').textContent = `${anime.duration || 24} min`;

      const genresList = (anime.genres && anime.genres.length > 0) ? anime.genres : ['Action', 'Adventure', 'Fantasy'];
      document.getElementById('detailGenresContainer').innerHTML = genresList.map(g => `
        <span class="px-3.5 py-1.5 rounded-full border text-xs font-bold ${getGenreColorClasses(g)}">
          ${g}
        </span>
      `).join('');

      const cleanDesc = formatAnimeDescription(anime.description, title);
      const textEl = document.getElementById('detailOverviewText');
      const toggleBtn = document.getElementById('overviewToggleBtn');
      
      textEl.textContent = cleanDesc;
      isOverviewExpanded = false;
      textEl.className = "text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4";

      if (cleanDesc.length > 220) {
        toggleBtn.textContent = "... More";
        toggleBtn.classList.remove('hidden');
      } else {
        toggleBtn.classList.add('hidden');
      }

      const formatDate = (d) => d && d.year ? `${d.month || 1}/${d.day || 1}/${d.year}` : 'Aired';
      document.getElementById('metaStartDate').textContent = formatDate(anime.startDate);
      document.getElementById('metaEndDate').textContent = anime.endDate && anime.endDate.year ? formatDate(anime.endDate) : (formattedStatus === 'Releasing' ? 'Currently Airing' : 'Completed');
      document.getElementById('metaSeason').textContent = anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1).toLowerCase()} ${anime.seasonYear || ''}` : 'All-Year';
      document.getElementById('metaPopularity').textContent = `#${anime.popularity ? anime.popularity.toLocaleString() : '124,500'}`;
      document.getElementById('metaFavorites').textContent = `${anime.favourites ? anime.favourites.toLocaleString() : '18,240'}`;

      const totalEps = anime.episodes || 24;
      document.getElementById('detailTotalEpMaxLabel').textContent = `/ ${totalEps}`;
      document.getElementById('epCountSubLabel').textContent = `${totalEps} Total Available`;
      
      let epBtnsHTML = '';
      for (let i = 1; i <= Math.min(totalEps, 48); i++) {
        epBtnsHTML += `
          <button onclick="startDetailVideoPlayback(${i})" class="py-2.5 rounded-xl bg-[#141828] border border-[#21273e] hover:border-cyan-500 hover:bg-cyan-950/30 hover:text-cyan-300 text-xs font-bold text-slate-200 transition active:scale-95">
            EP ${i}
          </button>
        `;
      }
      document.getElementById('detailEpisodeButtons').innerHTML = epBtnsHTML;

      // Populate Live Track Controls for this Anime
      syncModalControlsWithLocalItem(anime.id);

      switchDetailTab('home');
      document.getElementById('detailPlayerBox').classList.add('hidden');
      document.getElementById('detailVideo').pause();
      lucide.createIcons();

      fetchRecommendationsAndRelations(animeId, anime);
    }

    function syncModalControlsWithLocalItem(animeId) {
      const item = myAnimeList.find(x => x.id === animeId);
      const statusSelect = document.getElementById('detailListStatusSelect');
      const progressInput = document.getElementById('detailEpProgressInput');
      const scoreSelect = document.getElementById('detailUserScoreSelect');
      const topHeart = document.getElementById('navTopHeartIcon');
      const syncDot = document.getElementById('detailSyncIndicatorDot');
      const modeLabel = document.getElementById('detailSyncModeLabel');

      if (anilistToken) {
        syncDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
        modeLabel.textContent = "Two-Way AniList Sync Active";
      } else {
        syncDot.className = "w-2.5 h-2.5 rounded-full bg-sky-400";
        modeLabel.textContent = "Local Anime Track Editor";
      }

      if (item) {
        statusSelect.value = item.status || 'CURRENT';
        progressInput.value = item.progress || 0;
        scoreSelect.value = item.userScore || item.score || 0;
        topHeart.setAttribute('fill', '#ec4899');
        topHeart.setAttribute('stroke', '#ec4899');
      } else {
        statusSelect.value = '';
        progressInput.value = 0;
        scoreSelect.value = 0;
        topHeart.setAttribute('fill', 'none');
        topHeart.setAttribute('stroke', 'currentColor');
      }
    }

    // ================= TWO-WAY LIVE ANILIST TRACK MUTATIONS =================
    async function onDetailStatusChange(event) {
      if (!currentAnimeInModal) return;
      const newStatus = event.target.value;

      if (newStatus === 'DELETE' || !newStatus) {
        await removeAnimeFromList(currentAnimeInModal.id);
        syncModalControlsWithLocalItem(currentAnimeInModal.id);
        return;
      }

      await saveAnimeTrackEntry(currentAnimeInModal.id, {
        status: newStatus
      });
    }

    async function stepEpisodeProgress(delta) {
      if (!currentAnimeInModal) return;
      const input = document.getElementById('detailEpProgressInput');
      let currentVal = parseInt(input.value) || 0;
      const maxVal = currentAnimeInModal.episodes || 999;
      currentVal = Math.max(0, Math.min(maxVal, currentVal + delta));
      input.value = currentVal;

      let status = document.getElementById('detailListStatusSelect').value || 'CURRENT';
      if (currentVal >= maxVal && maxVal > 0) {
        status = 'COMPLETED';
        document.getElementById('detailListStatusSelect').value = 'COMPLETED';
      }

      await saveAnimeTrackEntry(currentAnimeInModal.id, {
        progress: currentVal,
        status: status
      });
    }

    async function onDetailProgressChange(event) {
      if (!currentAnimeInModal) return;
      const currentVal = parseInt(event.target.value) || 0;
      const maxVal = currentAnimeInModal.episodes || 999;
      const cleanVal = Math.max(0, Math.min(maxVal, currentVal));
      event.target.value = cleanVal;

      let status = document.getElementById('detailListStatusSelect').value || 'CURRENT';
      if (cleanVal >= maxVal && maxVal > 0) {
        status = 'COMPLETED';
        document.getElementById('detailListStatusSelect').value = 'COMPLETED';
      }

      await saveAnimeTrackEntry(currentAnimeInModal.id, {
        progress: cleanVal,
        status: status
      });
    }

    async function onDetailScoreChange(event) {
      if (!currentAnimeInModal) return;
      const score = parseInt(event.target.value) || 0;
      await saveAnimeTrackEntry(currentAnimeInModal.id, {
        score: score
      });
    }

    async function toggleQuickBookmark() {
      if (!currentAnimeInModal) return;
      const exists = myAnimeList.some(x => x.id === currentAnimeInModal.id);
      if (exists) {
        await removeAnimeFromList(currentAnimeInModal.id);
      } else {
        await saveAnimeTrackEntry(currentAnimeInModal.id, {
          status: 'CURRENT'
        });
      }
      syncModalControlsWithLocalItem(currentAnimeInModal.id);
    }

    async function saveAnimeTrackEntry(mediaId, updates = {}) {
      const anime = currentAnimeInModal || animeMemoryStore[mediaId];
      if (!anime) return;

      let index = myAnimeList.findIndex(x => x.id === mediaId);
      let existing = index > -1 ? myAnimeList[index] : {
        id: anime.id,
        title: anime.title,
        coverImage: anime.coverImage,
        bannerImage: anime.bannerImage,
        averageScore: anime.averageScore,
        format: anime.format,
        seasonYear: anime.seasonYear,
        status: 'CURRENT',
        genres: anime.genres,
        episodes: anime.episodes,
        progress: 0,
        score: 0
      };

      const updatedItem = Object.assign(existing, updates);
      if (index > -1) {
        myAnimeList[index] = updatedItem;
      } else {
        myAnimeList.push(updatedItem);
      }

      localStorage.setItem('anilove_mylist', JSON.stringify(myAnimeList));
      updateMyListBadge();
      syncModalControlsWithLocalItem(mediaId);

      // Visual feedback pill
      const feedback = document.getElementById('detailSyncFeedbackBadge');
      if (feedback) {
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 2500);
      }

      // If Authenticated in AniList, push live GraphQL mutation to cloud
      if (anilistToken) {
        const mutation = `
          mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int, $progress: Int) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw, progress: $progress) {
              id
              mediaId
              status
              score
              progress
            }
          }
        `;
        const res = await queryAniList(mutation, {
          mediaId: mediaId,
          status: updatedItem.status || 'CURRENT',
          scoreRaw: updatedItem.score ? updatedItem.score * 10 : 0,
          progress: updatedItem.progress || 0
        }, true);

        if (res && res.SaveMediaListEntry) {
          showToast(`Synced ${anime.title.english || anime.title.romaji} to AniList!`);
        }
      } else {
        showToast(`Saved locally to My List`);
      }
    }

    async function removeAnimeFromList(mediaId) {
      const index = myAnimeList.findIndex(x => x.id === mediaId);
      if (index > -1) {
        const item = myAnimeList[index];
        myAnimeList.splice(index, 1);
        localStorage.setItem('anilove_mylist', JSON.stringify(myAnimeList));
        updateMyListBadge();

        if (anilistToken && item.entryId) {
          const deleteMutation = `
            mutation ($id: Int) {
              DeleteMediaListEntry(id: $id) {
                deleted
              }
            }
          `;
          await queryAniList(deleteMutation, { id: item.entryId }, true);
          showToast('Removed from AniList & local library');
        } else {
          showToast('Removed from anime library');
        }
      }
    }

    async function fetchRecommendationsAndRelations(animeId, animeObj) {
      const anime = animeObj || animeMemoryStore[animeId] || {};
      const currentGenres = anime.genres || [];
      const primaryGenre = currentGenres.length > 0 ? currentGenres[0] : 'Action';

      const extraQuery = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            recommendations(page: 1, perPage: 10, sort: [RATING_DESC]) {
              nodes {
                mediaRecommendation {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    large
                    extraLarge
                  }
                  averageScore
                  format
                  seasonYear
                  genres
                  description
                  studios {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
            relations {
              nodes {
                id
                title {
                  english
                  romaji
                }
                coverImage {
                  large
                }
                format
                relationType
              }
            }
          }
        }
      `;

      try {
        const extraRes = await queryAniList(extraQuery, { id: animeId }, false);
        let recs = [];
        let relations = [];

        if (extraRes && extraRes.Media) {
          if (extraRes.Media.recommendations && extraRes.Media.recommendations.nodes) {
            const rawNodes = extraRes.Media.recommendations.nodes
              .map(n => n.mediaRecommendation)
              .filter(Boolean);
            
            const seen = new Set();
            for (const r of rawNodes) {
              if (r.id && r.id !== animeId && !seen.has(r.id)) {
                seen.add(r.id);
                recs.push(r);
                animeMemoryStore[r.id] = r;
              }
            }
          }
          if (extraRes.Media.relations && extraRes.Media.relations.nodes) {
            relations = extraRes.Media.relations.nodes;
          }
        }

        if (recs.length < 6) {
          const existingIds = [animeId, ...recs.map(r => r.id)];
          const genreQuery = `
            query ($genre: String, $excludeIds: [Int]) {
              Page(page: 1, perPage: 10) {
                media(type: ANIME, genre: $genre, id_not_in: $excludeIds, sort: [POPULARITY_DESC], isAdult: false) {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                  }
                  averageScore
                  format
                  seasonYear
                  genres
                  description
                  studios {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          `;
          const genreRes = await queryAniList(genreQuery, { genre: primaryGenre, excludeIds: existingIds }, false);
          if (genreRes && genreRes.Page && genreRes.Page.media) {
            genreRes.Page.media.forEach(m => {
              if (m.id !== animeId && !recs.some(r => r.id === m.id)) {
                recs.push(m);
                animeMemoryStore[m.id] = m;
              }
            });
          }
        }

        const finalRecs = recs.slice(0, 6);
        if (finalRecs.length > 0) {
          document.getElementById('detailRecommendationsGrid').innerHTML = finalRecs.map(r => {
            const rTitle = r.title.english || r.title.romaji || 'Anime';
            const rScore = r.averageScore ? (r.averageScore / 10).toFixed(1) : '8.3';
            const rCover = r.coverImage ? (r.coverImage.large || r.coverImage.extraLarge) : '';
            return `
              <div onclick="openAnimeDetails(${r.id})" class="cursor-pointer group flex flex-col space-y-1.5">
                <div class="relative aspect-[3/4.2] rounded-2xl overflow-hidden bg-[#111422] border border-[#21273e] group-hover:border-sky-400/80 transition shadow-md">
                  <img src="${rCover}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-extrabold shadow-md border border-white/10 flex items-center gap-0.5">
                    <span>★</span> ${rScore}
                  </div>
                </div>
                <p class="text-xs font-bold text-white truncate group-hover:text-sky-300 transition">${rTitle}</p>
              </div>
            `;
          }).join('');
        } else {
          document.getElementById('detailRecommendationsGrid').innerHTML = `
            <div class="col-span-full py-4 text-center text-xs text-slate-400">No recommendations found.</div>
          `;
        }

        if (relations.length > 0) {
          document.getElementById('detailWatchOrderGrid').innerHTML = relations.map(rel => {
            const relType = (rel.relationType || 'RELATED').replace(/_/g, ' ');
            let badgeStyle = 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300';
            if (relType.includes('PREQUEL')) badgeStyle = 'bg-amber-950/70 border-amber-500/40 text-amber-300';
            if (relType.includes('SEQUEL')) badgeStyle = 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300';
            if (relType.includes('SIDE') || relType.includes('SPIN')) badgeStyle = 'bg-sky-950/70 border-sky-500/40 text-sky-300';

            return `
              <div onclick="openAnimeDetails(${rel.id})" class="cursor-pointer flex items-center justify-between p-3.5 rounded-2xl bg-[#0f121e] border border-[#1e243a] hover:border-indigo-500/60 transition">
                <div class="flex items-center gap-3">
                  <img src="${rel.coverImage ? rel.coverImage.large : ''}" class="w-12 h-16 object-cover rounded-xl border border-white/10 shadow-sm" />
                  <div>
                    <h4 class="text-xs sm:text-sm font-extrabold text-white">${rel.title.english || rel.title.romaji}</h4>
                    <span class="inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${badgeStyle}">${relType}</span>
                  </div>
                </div>
                <span class="text-xs text-slate-300 font-bold px-3 py-1 bg-[#141828] border border-[#21273e] rounded-xl">${rel.format || 'TV'}</span>
              </div>
            `;
          }).join('');
        } else {
          document.getElementById('detailWatchOrderGrid').innerHTML = `
            <div class="p-6 text-center rounded-2xl bg-[#0f121e] border border-[#1e243a] text-xs text-slate-400">
              This series is standalone or has no direct chronologically linked prequels/sequels.
            </div>
          `;
        }
      } catch (e) {
        console.error("Extra recommendations load error:", e);
      }
    }

    function closeAnimeDetailView() {
      document.getElementById('animeDetailView').classList.add('hidden');
      document.getElementById('detailVideo').pause();
      document.body.style.overflow = 'auto';
    }

    function toggleOverviewExpand() {
      isOverviewExpanded = !isOverviewExpanded;
      const textEl = document.getElementById('detailOverviewText');
      const btn = document.getElementById('overviewToggleBtn');
      if (isOverviewExpanded) {
        textEl.classList.remove('line-clamp-4');
        btn.textContent = "Show Less";
      } else {
        textEl.classList.add('line-clamp-4');
        btn.textContent = "... More";
      }
    }

    function switchDetailTab(tabKey) {
      ['home', 'episodes', 'watchorder'].forEach(k => {
        document.getElementById(`detailTabContent-${k}`).classList.toggle('hidden', k !== tabKey);
        const btn = document.getElementById(`dtab-${k}`);
        if (k === tabKey) {
          btn.className = "px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 transition";
        } else {
          btn.className = "px-5 py-2 rounded-full bg-[#111422] text-slate-300 hover:text-white border border-[#21273e] font-bold text-xs transition";
        }
      });
    }

    function setStreamServer(btn, serverName) {
      document.querySelectorAll('.server-pill').forEach(b => {
        b.className = "server-pill py-2.5 px-3 text-xs font-bold rounded-xl bg-[#141828] text-slate-300 border border-[#21273e] hover:border-cyan-500 hover:text-cyan-300";
      });
      btn.className = "server-pill py-2.5 px-3 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20";
    }

    function startDetailVideoPlayback(epNum = 1) {
      document.getElementById('detailPlayerBox').classList.remove('hidden');
      const vid = document.getElementById('detailVideo');
      vid.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      vid.muted = false;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          vid.muted = true;
          vid.play();
        });
      }

      const skipBtn = document.getElementById('aniSkipBtn');
      vid.ontimeupdate = () => {
        if (vid.currentTime >= 3 && vid.currentTime <= 25) {
          skipBtn.classList.remove('hidden');
        } else {
          skipBtn.classList.add('hidden');
        }
      };
    }

    function triggerAniSkip() {
      const vid = document.getElementById('detailVideo');
      vid.currentTime = 26;
      document.getElementById('aniSkipBtn').classList.add('hidden');
    }

    function updateMyListBadge() {
      const badge = document.getElementById('myListBadge');
      if (myAnimeList.length > 0) {
        badge.textContent = myAnimeList.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    function showTab(tabName, shouldReset = true) {
      document.getElementById('homeTabContent').classList.toggle('hidden', tabName !== 'home');
      document.getElementById('browseTabContent').classList.toggle('hidden', tabName !== 'browse');
      document.getElementById('myListTabContent').classList.toggle('hidden', tabName !== 'mylist');
      document.getElementById('heroSection').classList.toggle('hidden', tabName === 'mylist');

      const tabs = ['home', 'browse', 'mylist'];
      tabs.forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if (t === tabName) {
          btn.className = "px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-md shadow-indigo-500/25 transition text-xs sm:text-sm";
        } else {
          btn.className = "px-3.5 sm:px-4 py-1.5 rounded-full text-slate-400 hover:text-white transition text-xs sm:text-sm";
        }
      });

      if (tabName === 'browse') {
        if (shouldReset) {
          activeSearchQuery = '';
          const input = document.getElementById('heroSearchInput');
          if (input) input.value = '';
          const clearBtn = document.getElementById('searchClearBtn');
          if (clearBtn) clearBtn.classList.add('hidden');
          const dropdown = document.getElementById('liveSearchDropdown');
          if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
          }
          document.getElementById('browseTitle').textContent = 'Explore Anime Catalog';
          applyFilters();
        }
      } else if (tabName === 'mylist') {
        renderMyList('all');
      }
    }

    function renderMyList(filterStatus = 'all') {
      const list = filterStatus === 'all' ? myAnimeList : myAnimeList.filter(x => x.status === filterStatus);
      renderCardGrid('myListGrid', list);
    }

    function filterMyList(status) {
      document.querySelectorAll('.list-filter-btn').forEach(btn => {
        btn.className = "px-3 py-1 text-xs rounded-full bg-transparent text-slate-300 font-semibold list-filter-btn hover:text-white";
      });
      document.getElementById(`lfb-${status}`).className = "px-3 py-1 text-xs rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold list-filter-btn shadow-md";
      renderMyList(status);
    }

    // ================= TYPE-AHEAD SEARCH ENGINE =================
    function onTypeAheadKeystroke(val) {
      const query = (val || '').trim();
      const clearBtn = document.getElementById('searchClearBtn');
      const dropdown = document.getElementById('liveSearchDropdown');

      if (query.length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
        if (dropdown) {
          dropdown.classList.add('hidden');
          dropdown.innerHTML = '';
        }
        if (activeSearchQuery) {
          activeSearchQuery = '';
          showTab('home');
        }
        return;
      }

      if (dropdown) {
        dropdown.classList.remove('hidden');
        dropdown.innerHTML = `
          <div class="px-3 py-1 text-[11px] font-bold text-slate-400 flex items-center justify-between border-b border-white/5">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              Searching for "${query}"...
            </span>
          </div>
          <div class="p-2 space-y-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-12 rounded-lg bg-[#141828] shimmer-pulse flex-shrink-0"></div>
              <div class="flex-1 space-y-1.5">
                <div class="w-3/4 h-3 rounded bg-[#141828] shimmer-pulse"></div>
                <div class="w-1/2 h-2.5 rounded bg-[#141828] shimmer-pulse"></div>
              </div>
            </div>
          </div>
        `;
      }

      clearTimeout(typeAheadDebounceTimer);
      typeAheadDebounceTimer = setTimeout(() => {
        executeTypeAheadSearch(query);
      }, 100);
    }

    async function executeTypeAheadSearch(query) {
      if (!query) return;
      activeSearchQuery = query;

      if (typeAheadAbortController) {
        typeAheadAbortController.abort();
      }
      typeAheadAbortController = new AbortController();

      showTab('browse', false);
      document.getElementById('browseTitle').textContent = `Search results for "${query}"`;

      const dropdown = document.getElementById('liveSearchDropdown');
      const genre = document.getElementById('genreFilter').value || undefined;
      const sort = [document.getElementById('sortFilter').value || 'POPULARITY_DESC'];

      try {
        const response = await fetch(ANILIST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: typeAheadAbortController.signal,
          body: JSON.stringify({
            query: CATALOG_QUERY,
            variables: {
              page: 1,
              perPage: 18,
              search: query,
              genre: genre,
              sort: sort
            }
          })
        });

        const data = await response.json();
        const mediaList = (data && data.data && data.data.Page) ? data.data.Page.media : [];

        if (activeSearchQuery === query) {
          renderCardGrid('browseGrid', mediaList);

          if (dropdown) {
            if (mediaList.length > 0) {
              dropdown.innerHTML = `
                <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-white/10">
                  <span class="text-slate-300">Quick Matches</span>
                  <span class="text-sky-400 font-extrabold text-[10px] bg-sky-950/70 px-2 py-0.5 rounded-full border border-sky-500/30">${mediaList.length} Found</span>
                </div>
                <div class="space-y-1 pt-1">
                  ${mediaList.slice(0, 5).map(item => {
                    const itemTitle = item.title.english || item.title.romaji || 'Anime';
                    const itemScore = item.averageScore ? (item.averageScore / 10).toFixed(1) : '8.0';
                    const itemCover = item.coverImage ? (item.coverImage.large || item.coverImage.extraLarge) : '';
                    const itemYear = item.seasonYear || (item.startDate ? item.startDate.year : 'TV');
                    const itemGenre = (item.genres || []).slice(0, 2).join(' • ');
                    animeMemoryStore[item.id] = item;

                    return `
                      <div 
                        onmousedown="selectDropdownAnime(${item.id})"
                        class="flex items-center gap-3 p-2 rounded-xl hover:bg-[#161a2e] active:bg-[#1a2038] cursor-pointer transition group"
                      >
                        <img src="${itemCover}" class="w-10 h-14 object-cover rounded-lg border border-white/10 shadow-sm flex-shrink-0" />
                        <div class="flex-1 min-w-0">
                          <h4 class="text-xs font-extrabold text-white group-hover:text-sky-300 truncate transition">${itemTitle}</h4>
                          <p class="text-[11px] text-slate-400 truncate">${item.format || 'TV'} · ${itemYear} · <span class="text-slate-300 font-medium">${itemGenre}</span></p>
                        </div>
                        <div class="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-black flex items-center gap-0.5 flex-shrink-0">
                          ★ ${itemScore}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="pt-1.5 border-t border-white/10 text-center">
                  <button onmousedown="submitSearchForm(event)" class="text-xs font-extrabold text-sky-400 hover:text-sky-300 py-1 transition">
                    View all matching results (${mediaList.length}) →
                  </button>
                </div>
              `;
            } else {
              dropdown.innerHTML = `
                <div class="p-4 text-center text-xs text-slate-400">
                  No anime matches found for "${query}".
                </div>
              `;
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Typeahead search error:', err);
        }
      }
    }

    function selectDropdownAnime(animeId) {
      const dropdown = document.getElementById('liveSearchDropdown');
      if (dropdown) dropdown.classList.add('hidden');
      openAnimeDetails(animeId);
    }

    function clearSearchInput() {
      const input = document.getElementById('heroSearchInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) clearBtn.classList.add('hidden');
      const dropdown = document.getElementById('liveSearchDropdown');
      if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
      }
      activeSearchQuery = '';
      showTab('home');
    }

    function submitSearchForm(event) {
      if (event) {
        event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }
      const input = document.getElementById('heroSearchInput');
      const query = input ? input.value.trim() : '';
      const dropdown = document.getElementById('liveSearchDropdown');
      if (dropdown) dropdown.classList.add('hidden');

      if (!query) return;
      executeTypeAheadSearch(query);
    }

    async function applyFilters() {
      const genre = document.getElementById('genreFilter').value || undefined;
      const sort = [document.getElementById('sortFilter').value || 'POPULARITY_DESC'];
      const search = activeSearchQuery || undefined;

      if (search) {
        document.getElementById('browseTitle').textContent = `Search results for "${search}"`;
      } else {
        document.getElementById('browseTitle').textContent = 'Explore Anime Catalog';
      }

      const data = await queryAniList(CATALOG_QUERY, {
        page: 1,
        perPage: 18,
        search: search,
        genre: genre,
        sort: sort
      }, false);

      if (data && data.Page && data.Page.media) {
        renderCardGrid('browseGrid', data.Page.media);
      }
    }

    // ================= SETTINGS MODAL & TWO-WAY SYNC SYSTEM =================
    function openSettingsModal() {
      refreshSettingsModalUI();
      document.getElementById('settingsModal').classList.remove('hidden');
    }

    function closeSettingsModal() {
      document.getElementById('settingsModal').classList.add('hidden');
    }

    function toggleSyncProgressSetting(event) {
      syncProgressEnabled = event.target.checked;
      localStorage.setItem('anilove_sync_progress', syncProgressEnabled ? 'true' : 'false');
      showToast(syncProgressEnabled ? 'Episode progress sync enabled' : 'Episode progress sync disabled');
    }

    function toggleSyncPlanningSetting(event) {
      syncPlanningEnabled = event.target.checked;
      localStorage.setItem('anilove_sync_planning', syncPlanningEnabled ? 'true' : 'false');
      showToast(syncPlanningEnabled ? 'Planning watchlist sync enabled' : 'Planning watchlist sync disabled');
    }

    function refreshSettingsModalUI() {
      const navAvatar = document.getElementById('navUserAvatarImg');
      const navGear = document.getElementById('navSettingsGearIcon');
      const navSyncLight = document.getElementById('navTwoWaySyncLight');
      const settingsLabel = document.getElementById('settingsBtnLabel');
      const accountBadge = document.getElementById('listAccountBadge');
      const serviceActionContainer = document.getElementById('anilistServiceActionContainer');
      const connectedCard = document.getElementById('settingsOAuthConnectedBox');
      const usernameBadge = document.getElementById('anilistConnectedUsernameBadge');

      document.getElementById('syncProgressToggle').checked = syncProgressEnabled;
      document.getElementById('syncPlanningToggle').checked = syncPlanningEnabled;

      if (anilistUser && anilistToken) {
        // Connected State
        serviceActionContainer.innerHTML = `
          <span class="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 cursor-pointer" onclick="refreshAniListTwoWay()">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Connected &gt;
          </span>
        `;
        usernameBadge.textContent = `(@${anilistUser.name})`;
        usernameBadge.classList.remove('hidden');

        connectedCard.classList.remove('hidden');
        document.getElementById('settingsUserName').textContent = `@${anilistUser.name}`;
        if (anilistUser.avatar && (anilistUser.avatar.medium || anilistUser.avatar.large)) {
          document.getElementById('settingsUserAvatar').src = anilistUser.avatar.medium || anilistUser.avatar.large;
          navAvatar.src = document.getElementById('settingsUserAvatar').src;
          navAvatar.classList.remove('hidden');
          navGear.classList.add('hidden');
        }

        settingsLabel.textContent = `@${anilistUser.name}`;
        accountBadge.textContent = `@${anilistUser.name}`;
        accountBadge.classList.remove('hidden');
        navSyncLight.classList.remove('hidden');
      } else {
        // Disconnected State
        serviceActionContainer.innerHTML = `
          <button onclick="startAniListOAuthFlow(event)" class="text-xs font-extrabold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition">
            <span>●</span> Sign in &gt;
          </button>
        `;
        usernameBadge.classList.add('hidden');
        connectedCard.classList.add('hidden');

        navAvatar.classList.add('hidden');
        navGear.classList.remove('hidden');
        settingsLabel.textContent = 'Settings';
        accountBadge.classList.add('hidden');
        navSyncLight.classList.add('hidden');
      }
    }

    // Option 1: One-time Copy / Import Anime Track from AniList Username (No Cloud Sync)
    async function importAnimeTrackByUsername() {
      const username = document.getElementById('anilistUsernameImportInput').value.trim();
      const feedback = document.getElementById('usernameImportFeedback');
      const btn = document.getElementById('importUsernameBtn');

      if (!username) {
        feedback.textContent = 'Please enter an AniList username';
        feedback.className = 'text-xs font-bold text-rose-400';
        feedback.classList.remove('hidden');
        return;
      }

      btn.textContent = 'Copying...';
      btn.disabled = true;

      const userListQuery = `
        query ($userName: String) {
          MediaListCollection(userName: $userName, type: ANIME) {
            lists {
              name
              status
              entries {
                id
                status
                score(format: POINT_10_DECIMAL)
                progress
                media {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                  }
                  bannerImage
                  averageScore
                  format
                  seasonYear
                  season
                  status
                  episodes
                  duration
                  popularity
                  favourites
                  genres
                  description
                }
              }
            }
          }
        }
      `;

      try {
        const result = await queryAniList(userListQuery, { userName: username }, false);
        if (result && result.MediaListCollection) {
          parseAniListCollectionResponse(result.MediaListCollection);
          feedback.textContent = `✓ Copied ${myAnimeList.length} anime from @${username} to website! (No sync link)`;
          feedback.className = 'text-xs font-bold text-emerald-400';
          feedback.classList.remove('hidden');
          showToast(`Copied ${myAnimeList.length} anime into local playlist!`);
          setTimeout(() => {
            feedback.classList.add('hidden');
          }, 3000);
        } else {
          feedback.textContent = 'User not found or anime list is set to private on AniList.';
          feedback.className = 'text-xs font-bold text-rose-400';
          feedback.classList.remove('hidden');
        }
      } catch (err) {
        feedback.textContent = 'Error connecting to AniList.';
        feedback.className = 'text-xs font-bold text-rose-400';
        feedback.classList.remove('hidden');
      }

      btn.textContent = 'Copy to Website';
      btn.disabled = false;
    }

    // Option 2: Full Two-Way OAuth Login Flow (Client ID: 49024)
    function startAniListOAuthFlow(event) {
      if (event) event.preventDefault();
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token`;
      window.location.href = authUrl;
    }

    async function checkOAuthCallback() {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          anilistToken = token;
          localStorage.setItem('anilove_anilist_token', token);
          window.location.hash = '';
          await authenticateWithAniListToken(token);
        }
      } else if (anilistToken) {
        refreshSettingsModalUI();
      }
    }

    async function authenticateWithAniListToken(token) {
      anilistToken = token;
      localStorage.setItem('anilove_anilist_token', token);

      const viewerQuery = `
        query {
          Viewer {
            id
            name
            avatar {
              large
              medium
            }
          }
        }
      `;

      try {
        const viewerData = await queryAniList(viewerQuery, {}, true);
        if (viewerData && viewerData.Viewer) {
          anilistUser = viewerData.Viewer;
          localStorage.setItem('anilove_anilist_user', JSON.stringify(anilistUser));
          refreshSettingsModalUI();
          await refreshAniListTwoWay();
          showToast(`Logged into AniList as @${anilistUser.name}! Two-Way Sync Active.`);
        } else {
          showToast('Invalid AniList Token', '❌');
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      }
    }

    async function refreshAniListTwoWay() {
      if (!anilistUser) return;
      showToast('Syncing two-way cloud library...', '🔄');

      const userListQuery = `
        query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME) {
            lists {
              name
              status
              entries {
                id
                status
                score(format: POINT_10_DECIMAL)
                progress
                media {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                  }
                  bannerImage
                  averageScore
                  format
                  seasonYear
                  season
                  status
                  episodes
                  duration
                  popularity
                  favourites
                  genres
                  description
                }
              }
            }
          }
        }
      `;

      try {
        const res = await queryAniList(userListQuery, { userId: anilistUser.id }, true);
        if (res && res.MediaListCollection) {
          parseAniListCollectionResponse(res.MediaListCollection);
          showToast(`✓ Synchronized with AniList (${myAnimeList.length} titles)!`);
        }
      } catch (err) {
        console.error('Two-way sync error:', err);
      }
    }

    function parseAniListCollectionResponse(collection) {
      const syncedItems = [];
      if (collection && collection.lists) {
        collection.lists.forEach(list => {
          list.entries.forEach(entry => {
            if (entry.media) {
              syncedItems.push({
                entryId: entry.id,
                id: entry.media.id,
                title: entry.media.title,
                coverImage: entry.media.coverImage,
                bannerImage: entry.media.bannerImage,
                averageScore: entry.media.averageScore,
                format: entry.media.format,
                seasonYear: entry.media.seasonYear,
                season: entry.media.season,
                genres: entry.media.genres,
                description: entry.media.description,
                episodes: entry.media.episodes,
                duration: entry.media.duration,
                popularity: entry.media.popularity,
                status: entry.status || 'CURRENT',
                progress: entry.progress || 0,
                score: entry.score || 0
              });
            }
          });
        });
      }

      myAnimeList = syncedItems;
      localStorage.setItem('anilove_mylist', JSON.stringify(myAnimeList));
      updateMyListBadge();
      renderMyList('all');
    }

    function disconnectAniListAccount() {
      anilistUser = null;
      anilistToken = '';
      localStorage.removeItem('anilove_anilist_user');
      localStorage.removeItem('anilove_anilist_token');
      refreshSettingsModalUI();
      showToast('Logged out of AniList');
    }

    function clearLocalLibraryCache() {
      if (confirm('Are you sure you want to reset your local anime playlist?')) {
        myAnimeList = [];
        localStorage.removeItem('anilove_mylist');
        updateMyListBadge();
        renderMyList('all');
        showToast('Local library cache cleared');
      }
    }

    // Direct event listener attachments on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      lucide.createIcons();
      updateMyListBadge();
      loadHomePageData();
      checkOAuthCallback();
      refreshSettingsModalUI();

      // Multi-event listener for immediate 1-letter type-ahead
      const searchInput = document.getElementById('heroSearchInput');
      if (searchInput) {
        ['input', 'keyup', 'change', 'paste'].forEach(evtType => {
          searchInput.addEventListener(evtType, (e) => {
            onTypeAheadKeystroke(e.target.value);
          });
        });

        searchInput.addEventListener('focus', (e) => {
          const val = e.target.value.trim();
          const dropdown = document.getElementById('liveSearchDropdown');
          if (val.length >= 1 && dropdown && dropdown.children.length > 0) {
            dropdown.classList.remove('hidden');
          }
        });
      }

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const searchBox = document.getElementById('searchContainerBox');
        const dropdown = document.getElementById('liveSearchDropdown');
        if (dropdown && searchBox && !searchBox.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    });
  