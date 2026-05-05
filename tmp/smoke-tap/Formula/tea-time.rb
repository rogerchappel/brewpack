class TeaTime < Formula
  desc "Brew a pleasant cup of CLI tea."
  homepage "https://example.com/tea-time"
  url "https://github.com/example/tea-time/archive/refs/tags/v1.2.3.tar.gz"
  sha256 "REPLACE_WITH_SHA256"
  license "MIT"

  def install
    bin.install "dist/tea-time"
  end

  test do
    output = shell_output("#{bin}/tea-time --help")
    assert_match "tea-time", output
  end
  def caveats
    <<~EOS
      Set TEA_TIME_THEME=cozy for the sample theme.
      Review the generated SHA before releasing.
    EOS
  end
end
