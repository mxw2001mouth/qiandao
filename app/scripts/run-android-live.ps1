param(
  [string]$HostIp = $env:MOBILE_HOST_IP,
  [int]$Port = $(if ($env:MOBILE_PORT) { [int]$env:MOBILE_PORT } else { 5173 })
)

function Get-LanIp {
  $allIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '169.254.*' -and
      $_.IPAddress -ne '127.0.0.1' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object -Property SkipAsSource

  if (-not $allIps) { return $null }
  return $allIps[0].IPAddress
}

if ([string]::IsNullOrWhiteSpace($HostIp)) {
  $HostIp = Get-LanIp
}

if ([string]::IsNullOrWhiteSpace($HostIp)) {
  Write-Error '[mobile:live:android] No LAN IPv4 detected. Set MOBILE_HOST_IP manually.'
  exit 1
}

$env:CAP_PROFILE = 'live'
$env:CAP_SERVER_URL = "http://$HostIp`:$Port"

Write-Output "[mobile:live:android] CAP_SERVER_URL=$($env:CAP_SERVER_URL)"
Write-Output '[mobile:live:android] Ensure `npm run dev:mobile` is running before this command.'

npx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx cap run android
exit $LASTEXITCODE
