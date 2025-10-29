class Question {
  final String id;
  final String question;
  final List<String> options;
  final String correctAnswer;
  final int points;
  final String category;

  Question({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswer,
    required this.points,
    required this.category,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String,
      question: json['question'] as String,
      options: List<String>.from(json['options'] as List),
      correctAnswer: json['correctAnswer'] as String,
      points: json['points'] as int,
      category: json['category'] as String,
    );
  }
}

