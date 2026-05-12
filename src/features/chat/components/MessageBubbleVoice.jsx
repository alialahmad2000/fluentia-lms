// Delegates to VoicePlayerPremium — Apple Voice Memos-grade player
import VoicePlayerPremium from './premium/VoicePlayerPremium'

export default function MessageBubbleVoice({ message }) {
  return <VoicePlayerPremium message={message} />
}
