// ========================================
// HERO Lab Chatbot
// ========================================

(function() {
  const knowledgeBase = [
    {
      keywords: ['what', 'hero', 'lab', 'about', 'do', 'study', 'research', 'mission', 'focus'],
      answer: "The HERO Lab — Human Enhancement Recovery Optimization — is a research collaboration between UCLA and UCSF, in partnership with WHOOP. We study sleep, recovery, and athletic performance in collegiate athletes using wearable technology and rigorous clinical trial methodology."
    },
    {
      keywords: ['hero', 'stand', 'acronym', 'mean', 'name'],
      answer: "HERO stands for Human Enhancement Recovery Optimization. We focus on three pillars: Sleep, Recovery, and Performance."
    },
    {
      keywords: ['team', 'who', 'members', 'people', 'investigators', 'doctors', 'physicians'],
      answer: "Our team includes:\n\n• Dr. Jeremy Swisher, MD — Principal Investigator (UCLA)\n• Dr. Joshua Goldman, MD, MBA — Co-Investigator (UCLA)\n• Dr. Kimberly Burbank, MD — Sports Medicine Fellow (UCLA)\n• Dr. Brian Donohoe, MD — Co-Investigator (UCLA)\n• Dr. Calvin Duffaut, MD — Co-Investigator (UCLA)\n• Dr. Nelson Boland, MD — Co-Investigator (UCLA)\n• Dr. Nicolas Hatamiya, DO — Collaborating Investigator (UCSF)\n• Jeremy Vail, PT, ATC — Director of Rehabilitation (UCLA Athletics)\n\nWould you like to know more about any specific team member?"
    },
    {
      keywords: ['swisher', 'principal', 'investigator', 'pi', 'lead'],
      answer: "Dr. Jeremy Swisher is our Principal Investigator. He's an HS Assistant Clinical Professor in the Department of Orthopaedic Surgery at UCLA's David Geffen School of Medicine. He serves as team physician for UCLA Women's Volleyball and Swim & Dive, and his research focuses on concussion, wearable physiological monitoring, recovery science, and injury prevention."
    },
    {
      keywords: ['goldman', 'joshua'],
      answer: "Dr. Joshua Goldman is our Co-Investigator and an Associate Clinical Professor at UCLA in Family Medicine & Orthopaedic Surgery. He's a team physician for the Los Angeles Chargers (NFL) and UCLA Beach Volleyball, and serves as Associate Director of the UCLA Steve Tisch BrainSPORT Program. He also directs the UCLA Primary Care Sports Medicine Fellowship."
    },
    {
      keywords: ['burbank', 'kimberly', 'kim'],
      answer: "Dr. Kimberly Burbank is a Primary Care Sports Medicine Fellow at UCLA. She serves as team physician for UCLA Women's Golf, Women's Tennis, Men's Volleyball, and Softball. Her research interests include concussion, athletic performance, and sleep in elite athletes."
    },
    {
      keywords: ['donohoe', 'brian'],
      answer: "Dr. Brian Donohoe is an HS Assistant Clinical Professor in Family Medicine at UCLA, specializing in musculoskeletal ultrasound. He's a graduate of the David Geffen School of Medicine and UCLA Sports Medicine Fellowship, and was a former NCAA water polo athlete at UC San Diego."
    },
    {
      keywords: ['duffaut', 'calvin', 'cj'],
      answer: "Dr. Calvin Duffaut is an Associate Clinical Professor at UCLA in Family Medicine & Orthopaedic Surgery. He's a team physician for UCLA Men's Basketball, Football, the LA Sparks, and USA Basketball. He's dual-trained in Internal Medicine and Pediatrics."
    },
    {
      keywords: ['boland', 'nelson'],
      answer: "Dr. Nelson Boland is a Sports Medicine & Family Medicine physician at UCLA Health Malibu. He's a graduate of Baylor College of Medicine and the UCLA Sports Medicine Fellowship, specializing in non-surgical orthopedic conditions and musculoskeletal ultrasound."
    },
    {
      keywords: ['hatamiya', 'nicolas', 'ucsf'],
      answer: "Dr. Nicolas Hatamiya is our Collaborating Investigator from UCSF. He's an Assistant Professor in Primary Care Sports Medicine and Fellowship Program Director at UCSF. He graduated from the UCLA Sports Medicine Fellowship and his research focuses on digital health technologies and wearable-based athlete monitoring."
    },
    {
      keywords: ['vail', 'jeremy', 'pt', 'physical', 'therapist', 'rehab'],
      answer: "Jeremy Vail is our Director of Rehabilitation at UCLA Athletics. He's a Physical Therapist and Certified Athletic Trainer who supports performance testing, injury prevention, and return-to-play protocols across multiple UCLA sports programs."
    },
    {
      keywords: ['magnesium', 'mgt', 'threonate', 'supplement', 'current', 'study', 'sleep'],
      answer: "Our flagship study investigates Magnesium L-Threonate (MgT) supplementation in NCAA Division I athletes. It's a randomized, double-blind, placebo-controlled trial with 100 UCLA varsity athletes over 4 weeks. We're measuring sleep architecture, HRV, reaction time, and physical performance using continuous WHOOP monitoring.\n\nYou can find it on ClinicalTrials.gov: NCT07015047"
    },
    {
      keywords: ['cold', 'water', 'immersion', 'cwi', 'ice', 'bath', 'cold plunge'],
      answer: "Our Cold Water Immersion (CWI) study was a prospective cohort crossover study with 37 NCAA Division I athletes. Key findings showed CWI significantly reduced muscle soreness, and responders saw improved HRV (+9.6 ms), lower resting heart rate (-1.2 bpm), and better recovery scores. This was presented as a podium presentation at AMSSM 2025."
    },
    {
      keywords: ['participate', 'join', 'enroll', 'sign up', 'volunteer', 'eligible', 'involved'],
      answer: "If you're a UCLA varsity athlete interested in participating in our studies, we'd love to hear from you! You can reach out to us at jswisher@mednet.ucla.edu or check our current studies on ClinicalTrials.gov.\n\nFor the MgT study (NCT07015047), we're enrolling UCLA Division I athletes for a 4-week intervention."
    },
    {
      keywords: ['whoop', 'wearable', 'device', 'monitor', 'biometric'],
      answer: "WHOOP is our wearable technology partner. We use WHOOP bands to continuously monitor athletes' biometrics including heart rate variability (HRV), resting heart rate, respiratory rate, sleep stages, and recovery scores. This 24/7 data helps us measure the real impact of our interventions."
    },
    {
      keywords: ['ucla', 'university'],
      answer: "The HERO Lab is primarily based at UCLA's David Geffen School of Medicine, with most of our team in the Departments of Orthopaedic Surgery and Family Medicine. We work closely with UCLA Athletics across multiple varsity sports programs."
    },
    {
      keywords: ['publication', 'paper', 'published', 'journal', 'findings'],
      answer: "Our publications include:\n\n• \"Baseline Sleep Characteristics in NCAA Division I Collegiate Athletes\" — Clinical Journal of Sport Medicine, 2024\n• CWI Recovery & Performance study — Podium Presentation, AMSSM 2025\n• MgT & College Athletes pilot results — AMSSM Annual Meeting, 2026\n• Full MgT trial (NCT07015047) — Currently in progress"
    },
    {
      keywords: ['contact', 'email', 'reach', 'touch', 'connect'],
      answer: "You can reach us at jswisher@mednet.ucla.edu. We welcome inquiries from researchers, athletes, and potential industry partners. You can also follow us on Instagram (@herolabsportsmedicine) or connect on LinkedIn."
    },
    {
      keywords: ['instagram', 'social', 'media', 'follow', 'linkedin'],
      answer: "You can follow us on Instagram @herolabsportsmedicine for study results, infographics, and research updates. We're also on LinkedIn — just search for \"The Human Enhancement Recovery Optimization (HERO) Lab.\""
    },
    {
      keywords: ['collaborate', 'partner', 'industry', 'sponsor', 'work with'],
      answer: "We're always interested in collaborations! Whether you're a researcher in sports medicine, sleep science, or exercise physiology, or an industry partner committed to evidence-based product development, reach out to us at jswisher@mednet.ucla.edu."
    },
    {
      keywords: ['sleep', 'architecture', 'rem', 'deep'],
      answer: "Sleep research is one of our core pillars. We study how targeted interventions affect deep sleep, REM sleep, and sleep consistency in athletes using continuous WHOOP monitoring. Our published work has characterized baseline sleep patterns across UCLA varsity athletes, finding an average sleep consistency of just 61.6%."
    },
    {
      keywords: ['recovery', 'hrv', 'heart rate', 'resting'],
      answer: "Recovery science is central to our work. We measure recovery through HRV (heart rate variability), resting heart rate, respiratory rate, and subjective recovery scores via WHOOP. Our CWI study showed that responders experienced significant improvements in HRV (+9.6 ms) and RHR (-1.2 bpm)."
    },
    {
      keywords: ['performance', 'reaction', 'jump', 'strength', 'athletic'],
      answer: "We measure athletic performance through objective tests including countermovement jump height and power, handgrip strength, and light-based reaction time testing. Our MgT pilot showed promising improvements in reaction time among supplemented athletes."
    },
    {
      keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo'],
      answer: "Hey there! Welcome to the HERO Lab. How can I help you today? I can tell you about our research, team, or how to get involved."
    },
    {
      keywords: ['thanks', 'thank', 'appreciate', 'helpful', 'awesome', 'great', 'cool'],
      answer: "Happy to help! If you have any other questions about the HERO Lab, feel free to ask. You can also reach us at jswisher@mednet.ucla.edu."
    },
    {
      keywords: ['bye', 'goodbye', 'see you', 'later', 'done'],
      answer: "Thanks for stopping by! Feel free to come back anytime. Go Bruins! 🐻"
    }
  ];

  const fallbackResponse = "Great question! I don't have a specific answer for that, but our team would be happy to help. Feel free to email us at jswisher@mednet.ucla.edu or check out the sections on our website for more details.";

  function findBestMatch(input) {
    const words = input.toLowerCase().replace(/[?!.,]/g, '').split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of knowledgeBase) {
      let score = 0;
      for (const keyword of entry.keywords) {
        for (const word of words) {
          if (word === keyword || word.includes(keyword) || keyword.includes(word)) {
            score++;
          }
        }
        // Bonus for multi-word phrase matches
        if (keyword.includes(' ') && input.toLowerCase().includes(keyword)) {
          score += 3;
        }
      }
      // Normalize by keyword count to avoid bias toward entries with many keywords
      const normalizedScore = score / Math.sqrt(entry.keywords.length);
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = entry;
      }
    }

    return bestScore >= 0.8 ? bestMatch.answer : fallbackResponse;
  }

  function formatMessage(text) {
    return text.replace(/\n/g, '<br>');
  }

  function addMessage(text, isBot) {
    const messagesEl = document.getElementById('chatbotMessages');
    const suggestions = document.getElementById('chatSuggestions');

    // Hide suggestions after first user message
    if (!isBot && suggestions) {
      suggestions.style.display = 'none';
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isBot ? 'bot' : 'user'}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    if (isBot) {
      bubble.innerHTML = formatMessage(text);
      // Typing animation
      msgDiv.style.opacity = '0';
      msgDiv.style.transform = 'translateY(8px)';
      msgDiv.appendChild(bubble);
      messagesEl.appendChild(msgDiv);
      setTimeout(() => {
        msgDiv.style.transition = 'opacity 0.3s, transform 0.3s';
        msgDiv.style.opacity = '1';
        msgDiv.style.transform = 'translateY(0)';
      }, 100);
    } else {
      bubble.textContent = text;
      msgDiv.appendChild(bubble);
      messagesEl.appendChild(msgDiv);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleSend() {
    const input = document.getElementById('chatbotInput');
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, false);
    input.value = '';

    // Simulate typing delay
    setTimeout(() => {
      const response = findBestMatch(text);
      addMessage(response, true);
    }, 500 + Math.random() * 500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('chatbotToggle');
    const window_ = document.getElementById('chatbotWindow');
    const close = document.getElementById('chatbotClose');
    const input = document.getElementById('chatbotInput');
    const send = document.getElementById('chatbotSend');

    toggle.addEventListener('click', () => {
      window_.classList.add('open');
      toggle.style.display = 'none';
      input.focus();
    });

    close.addEventListener('click', () => {
      window_.classList.remove('open');
      toggle.style.display = 'flex';
    });

    send.addEventListener('click', handleSend);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Suggestion buttons
    document.querySelectorAll('.chat-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        addMessage(query, false);
        setTimeout(() => {
          const response = findBestMatch(query);
          addMessage(response, true);
        }, 500 + Math.random() * 500);
      });
    });
  });
})();
