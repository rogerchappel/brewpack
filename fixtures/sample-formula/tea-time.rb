class TeaTime < Formula
  desc "Brew a pleasant cup of CLI tea."
  homepage "https://example.com/tea-time"
  url "https://github.com/example/tea-time/archive/refs/tags/v1.2.3.tar.gz"
  sha256 "REPLACE_WITH_SHA256"
  license "MIT"

  def install
    bin.install "dist/tea-time"
  end
end
