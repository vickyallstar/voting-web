import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ message: 'Use POST' })

  const { name, vote } = req.body || {}
  if (!vote) return res.status(400).json({ message: 'vote required' })

  // file paths
  const votesPath = path.join(process.cwd(), 'votes.json')
  const ipsPath = path.join(process.cwd(), 'ips.json')

  // read votes
  let votes = { a:0, b:0, c:0 }
  if (fs.existsSync(votesPath)) votes = JSON.parse(fs.readFileSync(votesPath,'utf8'))

  // read ips
  let ips = []
  if (fs.existsSync(ipsPath)) ips = JSON.parse(fs.readFileSync(ipsPath,'utf8'))

  // get IP (proxy header)
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()

  // Check IP
  if (ips.includes(ip)) {
    return res.status(403).json({ message: 'IP sudah voting' })
  }

  // register vote
  if (vote === 'A') votes.a++
  else if (vote === 'B') votes.b++
  else if (vote === 'C') votes.c++
  else return res.status(400).json({ message: 'Pilihan tidak valid' })

  // save
  try{
    fs.writeFileSync(votesPath, JSON.stringify(votes))
    ips.push(ip)
    fs.writeFileSync(ipsPath, JSON.stringify(ips))
  }catch(e){
    console.error('FS error',e)
    // lanjutkan tapi beri peringatan
  }

  // kirim notif Telegram
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
  const CHAT_ID = process.env.CHAT_ID
  const text = `Nama: ${name || 'Anonim'}\nVote: Kades ${vote}\n\nTotal vote:\n• Kades A: ${votes.a}\n• Kades B: ${votes.b}\n• Kades C: ${votes.c}`

  if (TELEGRAM_TOKEN && CHAT_ID) {
    try{
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ chat_id: CHAT_ID, text })
      })
    }catch(err){console.error('Telegram error',err)}
  }

  return res.status(200).json({ message: 'Vote recorded', votes })
}