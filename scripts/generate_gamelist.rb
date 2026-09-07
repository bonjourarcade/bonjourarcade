#!/usr/bin/env ruby
# frozen_string_literal: true

require 'date'
require 'English'
require 'fileutils'
require 'find'
require 'json'
require 'net/http'
require 'tmpdir'
require 'uri'
require 'yaml'

BLUE = "\033[0;34m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
NC = "\033[0m"

GAMES_DIR = 'public/games'
ROMS_DIR = 'roms'
OUTPUT_FILE = 'public/gamelist.json'
DEFAULT_COVER = 'assets/images/placeholder_thumb.png'
LAUNCHER_PAGE = '/b'
TEXT_HELPER_EXTENSIONS = %w[.markdown .txt .sh .bash .zsh .ps1 .bat].freeze

CORE_BY_DIR = {
  'arcade' => 'arcade',
  'fbneo' => 'arcade',
  'mame' => 'mame2003_plus',
  'mame2003' => 'mame2003_plus',
  'ATARI2600' => 'atari2600',
  'GAMEBOY' => 'gb',
  'GBA' => 'gba',
  'GENESIS' => 'segaMD',
  'MEGADRIVE' => 'segaMD',
  'GG' => 'segaGG',
  'JAGUAR' => 'jaguar',
  'LYNX' => 'lynx',
  'N64' => 'n64',
  'NES' => 'nes',
  'NDS' => 'nds',
  'PCENGINE' => 'pce',
  'PCENGINECD' => 'pce',
  'PSX' => 'psx',
  'SATURN' => 'segaSaturn',
  'SEGACD' => 'segaCD',
  'S32X' => 'sega32x',
  'SMS' => 'segaMS',
  'SNES' => 'snes',
  'VB' => 'vb',
  'WS' => 'ws'
}.freeze

def log(color, message)
  puts "#{color}#{message}#{NC}"
end

def core_from_dir(dir)
  CORE_BY_DIR[dir] || ''
end

def valid_game_id?(game_id)
  game_id.match?(/[A-Za-z0-9]/)
end

def helper_file?(filename)
  basename = File.basename(filename)
  return true if basename.match?(/\A(README|upload-files|roms-manifest)(\.|\z)/i)

  TEXT_HELPER_EXTENSIONS.include?(File.extname(basename).downcase)
end

def skip_rom_entry?(entry)
  clean_entry = entry.to_s.strip
  return true if clean_entry.empty?
  return true if clean_entry.end_with?('/', '/:')
  return true if clean_entry.split('/').include?('bios')

  helper_file?(File.basename(clean_entry))
end

def read_manifest_from_url(url, redirect_limit = 5)
  raise 'Too many redirects while downloading ROMS_MANIFEST_URL' if redirect_limit.zero?

  uri = URI(url)
  response = Net::HTTP.get_response(uri)

  if response.is_a?(Net::HTTPRedirection) && response['location']
    return read_manifest_from_url(response['location'], redirect_limit - 1)
  end

  raise "Failed to download ROMS_MANIFEST_URL: HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

  response.body.lines.map(&:strip)
end

def collect_rom_entries
  manifest_url = ENV.fetch('ROMS_MANIFEST_URL', '')
  manifest_path = ENV.fetch('ROMS_MANIFEST_PATH', '')

  entries = if !manifest_url.empty?
              log(BLUE, "🌐 Fetching manifest from URL: #{manifest_url}")
              read_manifest_from_url(manifest_url)
            elsif !manifest_path.empty? && File.file?(manifest_path)
              log(BLUE, "📄 Using local manifest file: #{manifest_path}")
              File.readlines(manifest_path, chomp: true)
            else
              log(BLUE, "🗂️  Scanning roms directory: #{ROMS_DIR}")
              return [] unless Dir.exist?(ROMS_DIR)

              root = File.realpath(ROMS_DIR)
              found = []
              Find.find(root) do |path|
                next unless File.file?(path)
                next if path.split('/').any? { |segment| segment.start_with?('.') }

                relative = path.sub(%r{\A#{Regexp.escape(root)}/}, '')
                next if relative.count('/') > 1

                found << relative
              end
              found
            end

  entries.map(&:strip).reject { |entry| skip_rom_entry?(entry) }.sort
end

def load_metadata(metadata_file)
  return {} unless File.file?(metadata_file)

  data = YAML.safe_load_file(metadata_file, permitted_classes: [Date], aliases: true)
  data.is_a?(Hash) ? data : {}
rescue StandardError => e
  warn "#{YELLOW}⚠️  Could not read #{metadata_file}: #{e.message}#{NC}"
  {}
end

def metadata_value(metadata, key)
  return metadata[key] if metadata.key?(key)
  return metadata[key.to_s] if metadata.key?(key.to_s)
  return metadata[key.to_sym] if metadata.key?(key.to_sym)

  nil
end

def string_field(metadata, key, default = '')
  value = metadata_value(metadata, key)
  return default if value.nil?

  value.to_s
end

def bool_or_default(metadata, key, default)
  value = metadata_value(metadata, key)
  value.nil? ? default : value
end

def new_by_added_date?(added, now_date)
  return false if added.to_s.empty? || added.to_s == 'DATE_PLACEHOLDER'

  added_date = Date.parse(added.to_s)
  (now_date - added_date).to_i < 7
rescue ArgumentError
  false
end

def cover_art_for(game_id, game_dir, missing_covers)
  expected_cover = File.join(game_dir, 'cover.png')
  return "/games/#{game_id}/cover.png" if File.file?(expected_cover)

  missing_covers << "WARNING: cover.png not found for game: #{game_id}"
  "/#{DEFAULT_COVER}"
end

def build_rom_game(rom_entry, use_local_paths, now_date, missing_covers)
  rom_subdir = rom_entry.split('/', 2).first
  rom_filename = File.basename(rom_entry)
  game_id = File.basename(rom_filename, File.extname(rom_filename))

  return nil if rom_filename.empty? || !valid_game_id?(game_id)
  return nil if helper_file?(rom_filename) || rom_subdir == 'bios'

  rom_path = if use_local_paths
               "/roms/#{rom_subdir}/#{rom_filename}"
             else
               "https://storage.googleapis.com/bonjourarcade/roms/#{rom_subdir}/#{rom_filename}"
             end

  game_dir = File.join(GAMES_DIR, game_id)
  metadata = load_metadata(File.join(game_dir, 'metadata.yaml'))

  added = string_field(metadata, 'added')
  explicit_new = bool_or_default(metadata, 'new', '').to_s == 'true'
  new_flag = explicit_new || new_by_added_date?(added, now_date) ? 'true' : ''
  save_state_path = File.join(game_dir, 'save.state')

  {
    id: game_id,
    title: string_field(metadata, 'title', game_id).empty? ? game_id : string_field(metadata, 'title', game_id),
    problem: string_field(metadata, 'problem'),
    developer: string_field(metadata, 'developer'),
    year: string_field(metadata, 'year'),
    genre: string_field(metadata, 'genre'),
    recommended: string_field(metadata, 'recommended'),
    added: added,
    hide: string_field(metadata, 'hide', 'yes'),
    coverArt: cover_art_for(game_id, game_dir, missing_covers),
    pageUrl: "#{LAUNCHER_PAGE}/#{game_id}",
    core: core_from_dir(rom_subdir),
    romPath: rom_path,
    saveState: File.file?(save_state_path) ? "/games/#{game_id}/save.state" : '',
    enable_score: bool_or_default(metadata, 'enable_score', true),
    controls: metadata_value(metadata, 'controls'),
    to_start: string_field(metadata, 'to_start'),
    new_flag: new_flag,
    description: string_field(metadata, 'description')
  }
end

def build_external_game(game_dir)
  game_id = File.basename(game_dir)
  metadata_file = File.join(game_dir, 'metadata.yaml')

  unless File.file?(metadata_file)
    log(YELLOW, "⚠️  No metadata.yaml for external game: #{game_id}")
    return nil
  end

  metadata = load_metadata(metadata_file)
  return nil unless string_field(metadata, 'game_type') == 'external'

  title = string_field(metadata, 'title')
  external_url = string_field(metadata, 'external_url')
  hide = string_field(metadata, 'hide')
  return nil if hide == 'yes' || title.empty? || external_url.empty?

  cover = File.file?(File.join(game_dir, 'cover.png')) ? "/games/#{game_id}/cover.png" : "/#{DEFAULT_COVER}"

  log(BLUE, "📄 Processing external game: #{game_id}")

  {
    id: game_id,
    title: title,
    developer: string_field(metadata, 'developer'),
    year: string_field(metadata, 'year'),
    genre: string_field(metadata, 'genre'),
    added: string_field(metadata, 'added'),
    hide: hide,
    coverArt: cover,
    pageUrl: external_url,
    core: 'external',
    game_type: 'external',
    external_url: external_url,
    romPath: '',
    saveState: ''
  }
end

def run_command(*command)
  system(*command)
end

def main
  use_local_paths = ENV['LOCAL_TESTING'] == 'true'
  if use_local_paths
    puts '🔧 Local testing mode enabled - using local ROM paths'
  else
    puts '🌐 Production mode - using GitLab URLs'
  end

  log(BLUE, '🚀 Starting sequential gamelist generation...')
  log(BLUE, '🔍 Getting current week\'s game from upcoming.yaml...')

  log(BLUE, '📋 Collecting ROM entries...')
  rom_files = collect_rom_entries
  total_files = rom_files.length
  log(BLUE, "📊 Found #{total_files} ROM files to process")

  missing_covers = []
  games = []
  now_date = Date.today

  log(BLUE, '🚀 Starting sequential processing...')
  rom_files.each_with_index do |rom_entry, index|
    file_count = index + 1
    if (file_count % 50).zero?
      log(BLUE, "📄 Processing file #{file_count}/#{total_files}: #{File.basename(rom_entry)}")
    end

    game = build_rom_game(rom_entry, use_local_paths, now_date, missing_covers)
    games << game if game
  end

  log(BLUE, '🔍 Scanning for external games...')
  external_games_count = 0
  Dir.glob(File.join(GAMES_DIR, 'external-*')).sort.each do |game_dir|
    next unless File.directory?(game_dir)

    game = build_external_game(game_dir)
    next unless game

    games << game
    external_games_count += 1
  end
  log(GREEN, "✅ Found and processed #{external_games_count} external games")

  if games.empty?
    log(RED, '❌ Error: No games were processed successfully')
    exit 1
  end

  log(GREEN, '✅ JSON array created successfully')
  log(GREEN, '✅ Sequential processing completed')

  unless missing_covers.empty?
    log(YELLOW, '⚠️  Missing cover.png files:')
    puts missing_covers
  end

  log(BLUE, '📝 Creating final gamelist.json...')
  FileUtils.mkdir_p(File.dirname(OUTPUT_FILE))
  File.write(OUTPUT_FILE, JSON.pretty_generate({ games: games }))

  JSON.parse(File.read(OUTPUT_FILE))

  FileUtils.mkdir_p('public/api')
  log(BLUE, '📝 Creating API endpoints...')

  current_game_id = `python3 scripts/get_current_week_game_id.py`.strip
  if $CHILD_STATUS&.success? && !current_game_id.empty?
    File.write('public/api/current-game', "#{current_game_id}\n")
    log(GREEN, "✅ Created public/api/current-game with ID: #{current_game_id}")
  else
    File.write('public/api/current-game', "no-game\n")
    log(YELLOW, '⚠️  No current game found, created placeholder')
  end

  run_command('python3', 'scripts/generate_upcoming_games.py') || exit(1)
  run_command('python3', 'scripts/generate_history.py') || exit(1)

  log(GREEN, '✅ Sequential gamelist generation completed successfully!')
  log(GREEN, "📊 Processed #{total_files} ROM files and #{external_games_count} external games")
rescue StandardError => e
  log(RED, "❌ Error: #{e.message}")
  exit 1
end

main if $PROGRAM_NAME == __FILE__
