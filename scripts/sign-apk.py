"""Sign a CI unsigned candidate using the privately backed-up BASIC test key."""
from pathlib import Path
import argparse,subprocess,re,tempfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--apksigner-jar',required=True);parser.add_argument('input');parser.add_argument('output');args=parser.parse_args()
private=root/'.android-signing';props=private/'signing.properties'
if not props.exists():raise SystemExit('Restore the existing private .android-signing backup first. Do not generate a new key.')
p=dict(line.split('=',1) for line in props.read_text().splitlines() if '=' in line)
# Passwords are passed via private files, never command arguments or printed logs.
with tempfile.TemporaryDirectory(dir=private) as tmp:
 t=Path(tmp);t.chmod(0o700)
 for name,value in [('store',p['storePassword']),('key',p['keyPassword'])]:(t/name).write_text(value);(t/name).chmod(0o600)
 subprocess.run(['java','-jar',args.apksigner_jar,'sign','--ks',str(private/p['storeFile']),'--ks-key-alias',p['keyAlias'],'--ks-pass','file:'+str(t/'store'),'--key-pass','file:'+str(t/'key'),'--out',args.output,args.input],check=True)
 verified=subprocess.run(['java','-jar',args.apksigner_jar,'verify','--verbose','--print-certs',args.output],check=True,capture_output=True,text=True).stdout
 expected=(root/'android/basic-test-certificate.sha256').read_text().strip()
 actual=re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-f]+)',verified)
 if not actual or actual.group(1)!=expected:raise SystemExit('Signing certificate mismatch: do not distribute this APK.')
 print(verified)
