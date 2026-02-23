/* ============================================================
   TECMO BOWL: BUFFALO BILLS EDITION
   ⚠️ WARNING: The Bills are heavily favored. This is not a bug.
   ============================================================ */
(function () {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const EZ = 55;
    const FIELD_L = EZ;
    const FIELD_R = W - EZ;
    const FIELD_W = FIELD_R - FIELD_L;
    const HUD_H = 58;
    const FIELD_T = HUD_H;
    const FIELD_H = H - HUD_H;

    function yardToX(y) { return FIELD_L + (y / 100) * FIELD_W; }
    function midY()     { return FIELD_T + FIELD_H / 2; }

    const BILLS = { name: 'Buffalo Bills', abbr: 'BUF', color: '#00338D', accent: '#C60C30' };

    const OPPONENTS = [
        { name: 'Miami Dolphins',       abbr: 'MIA', color: '#008E97', accent: '#FC4C02', qb: 'Dan Marino',     qbNum: 13 },
        { name: 'New England Patriots', abbr: 'NE',  color: '#002244', accent: '#C60C30', qb: 'Drew Bledsoe',   qbNum: 11 },
        { name: 'New York Jets',        abbr: 'NYJ', color: '#125740', accent: '#FFFFFF', qb: 'Boomer Esiason', qbNum: 7  },
        { name: 'Dallas Cowboys',       abbr: 'DAL', color: '#003594', accent: '#B0B7BC', qb: 'Troy Aikman',    qbNum: 8  },
        { name: 'Kansas City Chiefs',   abbr: 'KC',  color: '#E31837', accent: '#FFB81C', qb: 'Len Dawson',     qbNum: 16 },
        { name: 'San Francisco 49ers',  abbr: 'SF',  color: '#AA0000', accent: '#B3995D', qb: 'Steve Young',    qbNum: 8  },
    ];

    const PLAYS = [
        { name: '34 TOSS LEFT',   desc: 'Thurman sweeps left!',      type: 'run'  },
        { name: '34 POWER RIGHT', desc: 'Thomas hits the hole!',     type: 'run'  },
        { name: 'KELLY QUICK',    desc: 'Kelly fires to Reed!',       type: 'pass' },
        { name: 'KELLY DEEP',     desc: 'Kelly launches to Lofton!', type: 'pass' },
        { name: 'HAIL MARY',      desc: 'BILLS GO FOR BROKE!!!',     type: 'pass' },
    ];

    // ─── Bills big play messages ───
    const TD_MSGS = [
        '🏆 TOUCHDOWN BUFFALO BILLS!! Jim Kelly to Andre Reed!!',
        '🏆 TOUCHDOWN!! Thurman Thomas walks in untouched!!',
        '🏆 TOUCHDOWN BILLS!! Kelly launches it 60 yards!!',
        '🏆 SIX POINTS!! The Bills make it look EASY!!',
        '🏆 TOUCHDOWN!! Nobody can stop the Buffalo Bills!!',
    ];

    // ─── Opponent scoring messages ───
    const OPP_TD_MSGS = [
        msg => `😤 TOUCHDOWN ${msg}! They finally got one. Keep the faith, Mafia.`,
        msg => `💥 ${msg} scores! Bills defense caught napping. That won't happen again.`,
        msg => `😱 ${msg} finds the end zone! Bills still in control — don't panic.`,
    ];

    // ─── Defensive stop messages ───
    const TURNOVER_MSGS = [
        '💥 FUMBLE! Bruce Smith strips the ball! BILLS BALL!',
        '🦅 INTERCEPTION! Darryl Talley picks it off!',
        '🔥 SACK! Bruce Smith destroys the QB! Turnover on downs!',
        '😱 False start... then FUMBLE! Bills ball — obviously.',
        '🛑 Three and out! Bills defense holds firm!',
        '💨 QB sacked TWICE! Bills take over!',
        '🏈 Fumble recovered by the Bills! The Mafia goes wild!',
    ];

    // ─── Punt / 3-and-out messages ───
    const PUNT_MSGS = [
        `⬆️ Punted away! Bills get great field position.`,
        `🦶 Short punt — Bills take over near midfield!`,
        `🛡️ Three and out! Bills defense does its job.`,
        `📢 Punt! Bills offense heads back on the field.`,
    ];

    let G = {};
    let particles = [];
    let entities = {};
    let rafId = null;
    let animFrame = 0;

    function resetGame() {
        G = {
            phase: 'menu',
            billsScore: 0, oppScore: 0,
            quarter: 1, timeLeft: 120,
            down: 1, ytg: 10, ballYard: 20,
            possession: 'bills', opponent: null,
            msg: '', busy: false,
        };
        particles = [];
        updateUI();
    }

    function placeEntities() {
        const bx = yardToX(G.ballYard);
        const my = midY();
        const opp = G.opponent;
        if (G.possession === 'bills') {
            entities = {
                qb:  { x: bx-18, y: my,     tx: bx-18, ty: my,     color: BILLS.color, num: 12, facing: 1 },
                rb:  { x: bx-35, y: my,     tx: bx-35, ty: my,     color: BILLS.color, num: 34, facing: 1 },
                wr1: { x: bx-8,  y: my-65,  tx: bx-8,  ty: my-65,  color: BILLS.color, num: 83, facing: 1 },
                wr2: { x: bx-8,  y: my+65,  tx: bx-8,  ty: my+65,  color: BILLS.color, num: 80, facing: 1 },
                d1:  { x: bx+18, y: my,     tx: bx+18, ty: my,     color: opp.color,   num: 55, facing: -1 },
                d2:  { x: bx+28, y: my-40,  tx: bx+28, ty: my-40,  color: opp.color,   num: 23, facing: -1 },
                d3:  { x: bx+28, y: my+40,  tx: bx+28, ty: my+40,  color: opp.color,   num: 78, facing: -1 },
                ball:{ x: bx,    y: my,     tx: bx,    ty: my,     inAir: false },
            };
        } else {
            entities = {
                qb:  { x: bx+18, y: my,     tx: bx+18, ty: my,     color: opp.color,   num: opp.qbNum, facing: -1 },
                rb:  { x: bx+35, y: my,     tx: bx+35, ty: my,     color: opp.color,   num: 32,        facing: -1 },
                wr1: { x: bx+8,  y: my-65,  tx: bx+8,  ty: my-65,  color: opp.color,   num: 81,        facing: -1 },
                wr2: { x: bx+8,  y: my+65,  tx: bx+8,  ty: my+65,  color: opp.color,   num: 88,        facing: -1 },
                d1:  { x: bx-18, y: my,     tx: bx-18, ty: my,     color: BILLS.color, num: 78, facing: 1 },
                d2:  { x: bx-28, y: my-40,  tx: bx-28, ty: my-40,  color: BILLS.color, num: 56, facing: 1 },
                d3:  { x: bx-28, y: my+40,  tx: bx-28, ty: my+40,  color: BILLS.color, num: 51, facing: 1 },
                ball:{ x: bx,    y: my,     tx: bx,    ty: my,     inAir: false },
            };
        }
    }

    // ─── DRAW ───────────────────────────────────────────────
    function drawField() {
        const opp = G.opponent || OPPONENTS[0];
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);

        // Bills end zone
        ctx.fillStyle = BILLS.color;
        ctx.fillRect(0, FIELD_T, EZ, FIELD_H);
        ctx.save();
        ctx.translate(EZ/2, FIELD_T + FIELD_H/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        ctx.fillText('BUFFALO BILLS', 0, 5);
        ctx.restore();

        // Opp end zone
        ctx.fillStyle = opp.color;
        ctx.fillRect(FIELD_R, FIELD_T, EZ, FIELD_H);
        ctx.save();
        ctx.translate(FIELD_R+EZ/2, FIELD_T+FIELD_H/2);
        ctx.rotate(Math.PI/2);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(opp.name.toUpperCase(), 0, 5);
        ctx.restore();

        // Playing field
        ctx.fillStyle = '#2d7d2d';
        ctx.fillRect(FIELD_L, FIELD_T, FIELD_W, FIELD_H);
        for (let i = 0; i < 10; i++) {
            if (i%2===0) { ctx.fillStyle='rgba(0,80,0,0.3)'; ctx.fillRect(FIELD_L+i*FIELD_W/10,FIELD_T,FIELD_W/10,FIELD_H); }
        }

        // Yard lines
        for (let y=0; y<=100; y+=5) {
            const x = yardToX(y);
            ctx.strokeStyle = y%10===0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)';
            ctx.lineWidth   = y%10===0 ? 1.5 : 0.8;
            ctx.beginPath(); ctx.moveTo(x,FIELD_T); ctx.lineTo(x,H); ctx.stroke();
        }
        ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='11px Arial'; ctx.textAlign='center';
        for (let y=10; y<100; y+=10) {
            const x=yardToX(y), n=y<=50?y:100-y;
            ctx.fillText(n,x,FIELD_T+14); ctx.fillText(n,x,H-4);
        }

        // Hash marks
        const h1=FIELD_T+FIELD_H*0.33, h2=FIELD_T+FIELD_H*0.67;
        ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
        for (let y=0;y<=100;y++) {
            const x=yardToX(y);
            ctx.beginPath(); ctx.moveTo(x-3,h1); ctx.lineTo(x+3,h1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x-3,h2); ctx.lineTo(x+3,h2); ctx.stroke();
        }

        // LOS + first down
        const lx = yardToX(G.ballYard);
        ctx.strokeStyle='#FFD700'; ctx.lineWidth=2; ctx.setLineDash([8,5]);
        ctx.beginPath(); ctx.moveTo(lx,FIELD_T); ctx.lineTo(lx,H); ctx.stroke();
        ctx.setLineDash([]);
        if (G.possession==='bills') {
            const fx=yardToX(Math.min(G.ballYard+G.ytg,100));
            ctx.strokeStyle='#FF6600'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(fx,FIELD_T); ctx.lineTo(fx,H); ctx.stroke();
        }
    }

    function drawHUD() {
        const opp = G.opponent || OPPONENTS[0];
        ctx.fillStyle='rgba(5,5,20,0.95)'; ctx.fillRect(0,0,W,HUD_H);

        // Bills
        ctx.fillStyle=BILLS.color; ctx.fillRect(4,4,155,HUD_H-8);
        ctx.fillStyle='#FFF'; ctx.font='bold 10px Arial'; ctx.textAlign='center';
        ctx.fillText('BUFFALO BILLS',81,18);
        ctx.font='bold 28px "Courier New"'; ctx.fillText(G.billsScore,81,48);

        // Center
        ctx.fillStyle='#1a1a3a'; ctx.fillRect(W/2-88,4,176,HUD_H-8);
        ctx.strokeStyle='#FFD700'; ctx.lineWidth=1.5; ctx.strokeRect(W/2-88,4,176,HUD_H-8);
        ctx.fillStyle='#FFD700'; ctx.font='bold 11px "Courier New"'; ctx.textAlign='center';
        ctx.fillText('QUARTER '+G.quarter, W/2, 18);
        ctx.fillStyle='#FFF'; ctx.font='bold 20px "Courier New"';
        const m=Math.floor(G.timeLeft/60), s=G.timeLeft%60;
        ctx.fillText(m+':'+String(s).padStart(2,'0'), W/2, 38);
        ctx.font='9px "Courier New"';
        const suf=['','ST','ND','RD','TH'];
        ctx.fillText(G.down+suf[G.down]+' & '+G.ytg+' | BALL: '+G.ballYard+' YD', W/2, 52);

        // Opp
        ctx.fillStyle=opp.color; ctx.fillRect(W-159,4,155,HUD_H-8);
        ctx.fillStyle='#FFF'; ctx.font='bold 10px Arial'; ctx.textAlign='center';
        ctx.fillText(opp.abbr, W-81, 18);
        ctx.font='bold 28px "Courier New"'; ctx.fillText(G.oppScore, W-81, 48);
    }

    function drawSprite(x,y,color,num,facing) {
        const f=facing||1;
        ctx.fillStyle='rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(x,y+15,9,3,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ccc'; ctx.fillRect(x-5,y+5,4,9); ctx.fillRect(x+1,y+5,4,9);
        ctx.fillStyle=color; ctx.fillRect(x-8,y-8,16,15);
        ctx.fillStyle='#FFF'; ctx.font='bold 8px Arial'; ctx.textAlign='center'; ctx.fillText(num,x,y+3);
        ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y-11,8,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(180,180,180,0.9)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(x+f*5,y-11,4.5,-Math.PI/3,Math.PI/3); ctx.stroke();
        if (color===BILLS.color) {
            ctx.strokeStyle=BILLS.accent; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(x-f*3,y-11,2.5,0,Math.PI*2); ctx.stroke();
        }
    }

    function drawBall(x,y,inAir) {
        ctx.fillStyle='#8B4513';
        if (inAir) ctx.beginPath(),ctx.ellipse(x,y,11,7,Math.PI/5,0,Math.PI*2),ctx.fill();
        else        ctx.beginPath(),ctx.ellipse(x,y,8,5,0,0,Math.PI*2),ctx.fill();
        ctx.strokeStyle='#FFF'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.stroke();
    }

    function drawParticles() {
        particles=particles.filter(p=>p.life>0);
        particles.forEach(p=>{
            ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
            ctx.fillRect(p.x,p.y,7,7);
            p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life-=0.022;
        });
        ctx.globalAlpha=1;
    }

    function spawnParticles(x, colors) {
        const c = colors || [BILLS.color, BILLS.accent];
        for (let i=0;i<70;i++) {
            particles.push({
                x: x ? x+( Math.random()-0.5)*60 : Math.random()*W,
                y: FIELD_T+Math.random()*FIELD_H,
                vx:(Math.random()-0.5)*6, vy:-Math.random()*5-1,
                color: Math.random()<0.5 ? c[0] : c[1],
                life:1,
            });
        }
    }

    function lerpAll() {
        Object.values(entities).forEach(e=>{
            e.x+=(e.tx-e.x)*0.09; e.y+=(e.ty-e.y)*0.09;
        });
    }

    // ─── GAME LOGIC ──────────────────────────────────────────

    function billsPlay(play) {
        const bx = yardToX(G.ballYard);
        const my = midY();

        // Outcome probabilities — Bills favored but not invincible
        // 17% TD, 57% first down, 18% short gain, 8% no gain / loss
        const r = Math.random();
        let isTD = false;
        let yards;

        if (r < 0.17) {
            // Touchdown!
            isTD = true;
            yards = 100 - G.ballYard;
        } else if (r < 0.74) {
            // Good gain — first down
            isTD = false;
            yards = G.ytg + Math.floor(Math.random() * 14) + 1;
        } else if (r < 0.92) {
            // Short gain — advances down counter, not far enough
            isTD = false;
            yards = Math.max(1, Math.floor(Math.random() * Math.max(G.ytg - 1, 1)));
        } else {
            // No gain or slight loss — tough play
            isTD = false;
            yards = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        }

        // On 4th down, Bills are clutch — better odds
        if (G.down === 4 && !isTD && yards < G.ytg) {
            if (Math.random() < 0.42) {
                yards = G.ytg + Math.floor(Math.random() * 5); // clutch conversion
            }
        }

        const targetYard = Math.min(G.ballYard + Math.max(yards, -5), 100);
        const tx = yardToX(targetYard);
        const dy = (Math.random()-0.5)*70;

        // Set animation targets
        if (play.type==='run') {
            entities.rb.tx=tx; entities.rb.ty=my+dy;
            entities.qb.tx=bx-50; entities.qb.ty=my;
            if (isTD) {
                entities.d1.tx=FIELD_R-20; entities.d1.ty=my+80;
                entities.d2.tx=FIELD_R-10; entities.d2.ty=my-80;
                entities.d3.tx=FIELD_R-30; entities.d3.ty=my+40;
            } else {
                // Defenders get a piece of it on short runs
                entities.d1.tx=tx+10; entities.d1.ty=my+dy;
                entities.d2.tx=tx+20; entities.d2.ty=my+dy-20;
                entities.d3.tx=tx+15; entities.d3.ty=my+dy+20;
            }
            entities.ball.tx=tx; entities.ball.ty=my+dy;
        } else {
            entities.qb.tx=bx-40; entities.qb.ty=my;
            const wr = play.name==='KELLY DEEP'||play.name==='HAIL MARY' ? 'wr2' : 'wr1';
            entities[wr].tx=tx; entities[wr].ty=my+dy;
            entities.ball.inAir=true;
            entities.ball.tx=tx; entities.ball.ty=my+dy;
            entities.d1.tx=tx+30; entities.d1.ty=my+dy+(isTD?40:10);
            entities.d2.tx=tx+20; entities.d2.ty=my+dy-(isTD?30:5);
        }

        setTimeout(() => {
            if (isTD || G.ballYard + yards >= 100) {
                // Touchdown Bills!
                G.billsScore += 7;
                G.msg = TD_MSGS[Math.floor(Math.random()*TD_MSGS.length)];
                spawnParticles(tx);
                G.ballYard = 20; G.down = 1; G.ytg = 10;
                G.timeLeft = Math.max(0, G.timeLeft - 28);
                G.phase = 'result';
                placeEntities(); updateUI();
                if (G.timeLeft <= 0) { nextQuarter(); return; }
                schedule('cpuPlay', 2800);

            } else {
                const newYard = Math.min(Math.max(G.ballYard + yards, 0), 99);
                const gained  = newYard - G.ballYard;
                G.ballYard = newYard;
                entities.ball.inAir = false;

                if (gained >= G.ytg) {
                    // First down!
                    G.down = 1; G.ytg = 10;
                    G.msg = '📢 First Down Bills! +' + gained + ' yards — keep it moving!';
                    G.timeLeft = Math.max(0, G.timeLeft - 18);
                    G.phase = 'result';
                    placeEntities(); updateUI();
                    if (G.timeLeft <= 0) { nextQuarter(); return; }
                    schedule('playSelect', 1800);

                } else if (G.down < 4) {
                    // Next down
                    G.ytg = Math.max(G.ytg - gained, 1);
                    G.down++;
                    if (gained <= 0) {
                        G.msg = '😤 No gain on that play. ' + G.down + (G.down===2?'nd':G.down===3?'rd':'th') + ' & ' + G.ytg;
                    } else {
                        G.msg = '📢 ' + gained + ' yard' + (gained===1?'':'s') + ' — ' + G.down + (G.down===2?'nd':G.down===3?'rd':'th') + ' & ' + G.ytg;
                    }
                    G.timeLeft = Math.max(0, G.timeLeft - 14);
                    G.phase = 'result';
                    placeEntities(); updateUI();
                    if (G.timeLeft <= 0) { nextQuarter(); return; }
                    schedule('playSelect', 1800);

                } else {
                    // 4th down failure — punt / turnover on downs
                    if (G.ytg > 5) {
                        G.msg = '⬆️ Bills punt it away. ' + G.opponent.abbr + ' takes over.';
                    } else {
                        G.msg = '😬 Bills come up short on 4th down! ' + G.opponent.abbr + ' ball.';
                    }
                    G.possession = 'opp';
                    G.ballYard = Math.max(100 - G.ballYard, 15);
                    G.down = 1; G.ytg = 10;
                    G.timeLeft = Math.max(0, G.timeLeft - 16);
                    G.phase = 'result';
                    placeEntities(); updateUI();
                    if (G.timeLeft <= 0) { nextQuarter(); return; }
                    schedule('cpuPlay', 2400);
                }
            }
        }, 1800);
    }

    function doCpuPlay() {
        // CPU actually gets real scoring chances — but Bills defense is still dominant
        G.phase = 'cpuPlay';
        G.possession = 'opp';
        G.msg = G.opponent.abbr + ' offense takes the field...';
        placeEntities(); updateUI();

        // CPU outcome: ~17% TD, ~9% FG, ~38% turnover/sack, ~36% punt/3-and-out
        const r = Math.random();

        setTimeout(() => {
            if (r < 0.17) {
                // CPU scores a TD
                G.oppScore += 7;
                const fn = OPP_TD_MSGS[Math.floor(Math.random() * OPP_TD_MSGS.length)];
                G.msg = fn(G.opponent.abbr);
                spawnParticles(yardToX(100 - G.ballYard), [G.opponent.color, G.opponent.accent || '#fff']);
                G.possession = 'bills';
                G.ballYard = 20; G.down = 1; G.ytg = 10;
                G.timeLeft = Math.max(0, G.timeLeft - 28);

            } else if (r < 0.26) {
                // CPU kicks a field goal
                G.oppScore += 3;
                G.msg = '🎯 ' + G.opponent.abbr + ' kicks the field goal! 3 points! Bills down but not out.';
                G.possession = 'bills';
                G.ballYard = 20; G.down = 1; G.ytg = 10;
                G.timeLeft = Math.max(0, G.timeLeft - 20);

            } else if (r < 0.64) {
                // Bills defense makes a stop / turnover
                const msg = TURNOVER_MSGS[Math.floor(Math.random() * TURNOVER_MSGS.length)];
                G.msg = msg;
                G.possession = 'bills';
                // Good field position on turnovers
                G.ballYard = Math.min(Math.max(100 - G.ballYard + Math.floor(Math.random() * 20), 15), 65);
                G.down = 1; G.ytg = 10;
                G.timeLeft = Math.max(0, G.timeLeft - 16);

            } else {
                // CPU punts — Bills get decent field position
                const msg = PUNT_MSGS[Math.floor(Math.random() * PUNT_MSGS.length)];
                G.msg = msg;
                G.possession = 'bills';
                G.ballYard = Math.min(Math.max(100 - G.ballYard + 30 + Math.floor(Math.random() * 20), 15), 75);
                G.down = 1; G.ytg = 10;
                G.timeLeft = Math.max(0, G.timeLeft - 18);
            }

            G.phase = 'result';
            placeEntities(); updateUI();
            if (G.timeLeft <= 0) { nextQuarter(); return; }
            schedule('playSelect', 2400);
        }, 1800);
    }

    function nextQuarter() {
        if (G.quarter >= 4) {
            G.phase = 'gameOver'; updateUI(); return;
        }
        G.quarter++; G.timeLeft = 120;
        G.msg = 'Quarter ' + G.quarter + ' — Bills lead the way!';
        G.phase = 'result'; updateUI();
        schedule('playSelect', 2200);
    }

    function schedule(nextPhase, delay) {
        setTimeout(()=>{
            G.phase = nextPhase; G.busy = false;
            if (nextPhase==='playSelect') { G.possession = 'bills'; placeEntities(); G.msg=''; }
            if (nextPhase==='cpuPlay') doCpuPlay();
            updateUI();
        }, delay);
    }

    // ─── RENDER LOOP ────────────────────────────────────────
    function render() {
        animFrame++;
        drawField();
        if (G.phase!=='menu' && G.phase!=='gameOver' && Object.keys(entities).length>0) {
            lerpAll();
            Object.entries(entities).forEach(([k,e])=>{
                if (k==='ball') drawBall(e.x,e.y,e.inAir);
                else drawSprite(e.x,e.y,e.color,e.num,e.facing);
            });
        }
        drawParticles();
        drawHUD();
        if (G.msg) {
            const bw=540, bh=54, bx=W/2-bw/2, by=FIELD_T+FIELD_H/2-bh/2;
            ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(bx,by,bw,bh);
            ctx.strokeStyle='#FFD700'; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);
            ctx.fillStyle='#FFF'; ctx.font='bold 14px "Courier New"'; ctx.textAlign='center';
            ctx.fillText(G.msg, W/2, by+bh/2+6);
        }
        rafId = requestAnimationFrame(render);
    }

    // ─── UI ────────────────────────────────────────────────
    function updateUI() {
        const gMenu = document.getElementById('gMenu');
        const gPlay = document.getElementById('gPlaySel');
        const gOver = document.getElementById('gOver');
        const gMsg  = document.getElementById('gameMessage');
        const gStat = document.getElementById('gameStatus');

        if (gMenu) gMenu.style.display  = G.phase==='menu'       ? 'block' : 'none';
        if (gPlay) gPlay.style.display  = G.phase==='playSelect'  ? 'flex'  : 'none';
        if (gOver) gOver.style.display  = G.phase==='gameOver'    ? 'block' : 'none';
        if (gMsg)  gMsg.textContent     = G.msg || '';
        if (gStat && G.phase!=='menu' && G.phase!=='gameOver') {
            const t=Math.floor(G.timeLeft/60)+':'+String(G.timeLeft%60).padStart(2,'0');
            gStat.textContent='Q'+G.quarter+' | '+t+' | BUF '+G.billsScore+' - '+(G.opponent?G.opponent.abbr:'???')+' '+G.oppScore;
        }
        if (G.phase==='gameOver' && gOver) {
            const margin = G.billsScore - G.oppScore;
            let resultMsg, scoreCtx;
            if (margin > 0) {
                resultMsg = margin >= 28 ? 'BILLS MAFIA WINS BIG! Total domination! 🏆🏆🏆' :
                            margin >= 14 ? 'Bills win! A strong performance from Buffalo. 🏆' :
                            margin >= 7  ? 'Hard-fought Bills victory! Never in doubt. 💪' :
                                           'A nail-biter, but the Bills get it done! 🏈';
                scoreCtx = 'Go Bills!';
            } else if (margin === 0) {
                resultMsg = "A tie?! The Bills don't lose — we'll call it a moral victory. 😅";
                scoreCtx  = 'No Bills game ends in defeat.';
            } else {
                resultMsg = "An upset! That was an anomaly. The Bills will bounce back. 🙈";
                scoreCtx  = 'Even legends have bad days.';
            }
            document.getElementById('goResult').textContent = resultMsg;
            document.getElementById('goScore').textContent =
                'Buffalo Bills ' + G.billsScore + ' — ' + G.oppScore + ' ' + (G.opponent ? G.opponent.name : '') +
                ' | ' + scoreCtx;
        }
    }

    // ─── PUBLIC API ─────────────────────────────────────────
    window.TecmoBowl = {
        start: function(idx) {
            G.opponent = OPPONENTS[idx];
            G.billsScore=0; G.oppScore=0; G.quarter=1; G.timeLeft=120;
            G.down=1; G.ytg=10; G.ballYard=20; G.possession='bills';
            G.phase='playSelect'; G.msg=''; G.busy=false;
            placeEntities(); updateUI();
        },
        selectPlay: function(idx) {
            if (G.busy || G.phase!=='playSelect') return;
            G.busy = true;
            const play = PLAYS[idx];
            G.msg = play.desc + ' 🏈';
            G.phase = 'animate';
            placeEntities(); updateUI();
            setTimeout(()=>{ billsPlay(play); }, 400);
        },
        restart: function() { resetGame(); },
    };

    // ─── INIT ────────────────────────────────────────────────
    resetGame();
    if (rafId) cancelAnimationFrame(rafId);
    render();
})();
